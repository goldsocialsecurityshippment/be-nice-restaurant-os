import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/notifications";
import { logAction } from "@/lib/audit";
import { auth } from "@/lib/auth";

const STATUS_TIMESTAMP_FIELD: Record<string, string> = {
  ACCEPTED: "acceptedAt",
  PREPARING: "preparingAt",
  READY: "readyAt",
  SERVED: "servedAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const updateSchema = z.object({
  status: z
    .enum([
      "RECEIVED",
      "ACCEPTED",
      "PREPARING",
      "READY",
      "SERVED",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),

  paymentStatus: z
    .enum(["UNPAID", "PAID", "PARTIALLY_PAID", "REFUNDED"])
    .optional(),

  paymentMethod: z
    .enum(["CASH", "CARD", "MOBILE_MONEY", "OTHER"])
    .optional(),

  cancelReason: z.string().max(280).optional(),

  note: z.string().max(280).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      table: true,
      statusHistory: {
        orderBy: { changedAt: "asc" },
      },
      restaurant: {
        include: {
          settings: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json();

  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.order.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // Get the authenticated user ONCE.
  const session = await auth().catch(() => null);

  const sessionUser = session?.user as
    | {
        id?: string;
        role?: string;
        restaurantId?: string | null;
      }
    | undefined;

  const data: Record<string, unknown> = {};

  /*
   * STATUS UPDATE
   */

  if (parsed.data.status) {
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];

    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json(
        {
          error: `Cannot move order from ${existing.status} to ${parsed.data.status}`,
        },
        { status: 409 }
      );
    }

    // Customers may only cancel before the restaurant accepts
    // the order. Authenticated staff can cancel later.
    if (parsed.data.status === "CANCELLED") {
      const isStaff = !!sessionUser?.role;

      if (!isStaff && existing.status !== "RECEIVED") {
        return NextResponse.json(
          {
            error:
              "Orders can only be cancelled before they have been accepted.",
          },
          { status: 409 }
        );
      }
    }

    data.status = parsed.data.status;

    const timestampField =
      STATUS_TIMESTAMP_FIELD[parsed.data.status];

    if (timestampField) {
      data[timestampField] = new Date();
    }

    if (
      parsed.data.status === "CANCELLED" &&
      parsed.data.cancelReason
    ) {
      data.cancelReason = parsed.data.cancelReason;
    }

    // Record which staff member served the order.
    if (
      parsed.data.status === "SERVED" &&
      sessionUser?.id
    ) {
      data.servedById = sessionUser.id;
    }
  }

  /*
   * PAYMENT UPDATE
   */

  const paymentChanged =
    parsed.data.paymentStatus !== undefined ||
    parsed.data.paymentMethod !== undefined;

  if (paymentChanged) {
    const allowedPaymentRoles = [
      "ADMIN",
      "MANAGER",
      "CASHIER",
    ];

    if (
      !sessionUser?.id ||
      !sessionUser.role ||
      !allowedPaymentRoles.includes(sessionUser.role)
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to update payment information.",
        },
        { status: 403 }
      );
    }

    // Prevent staff from modifying another restaurant's order.
    if (
      sessionUser.restaurantId &&
      sessionUser.restaurantId !== existing.restaurantId
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to update this restaurant's orders.",
        },
        { status: 403 }
      );
    }

    if (parsed.data.paymentStatus !== undefined) {
      data.paymentStatus = parsed.data.paymentStatus;
    }

    if (parsed.data.paymentMethod !== undefined) {
      data.paymentMethod = parsed.data.paymentMethod;
    }
  }

  /*
   * SAVE ORDER
   */

  const order = await prisma.order.update({
    where: { id },
    data: {
      ...data,

      ...(parsed.data.status
        ? {
            statusHistory: {
              create: {
                status: parsed.data.status,
                note: parsed.data.note,
              },
            },
          }
        : {}),
    },

    include: {
      items: true,
      table: true,
    },
  });

  /*
   * FREE TABLE AFTER COMPLETION / CANCELLATION
   */

  if (
    order.tableId &&
    (order.status === "COMPLETED" ||
      order.status === "CANCELLED")
  ) {
    const activeOrders = await prisma.order.count({
      where: {
        tableId: order.tableId,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
    });

    if (activeOrders === 0) {
      await prisma.restaurantTable.update({
        where: {
          id: order.tableId,
        },
        data: {
          status: "AVAILABLE",
        },
      });

      publishEvent({
        type: "TABLE_UPDATED",
        restaurantId: order.restaurantId,
        tableId: order.tableId,
      });
    }
  }

  /*
   * REAL-TIME ORDER UPDATE
   */

  publishEvent({
    type: "ORDER_UPDATED",
    restaurantId: order.restaurantId,
    orderId: order.id,
    status: order.status,
  });

  /*
   * AUDIT LOG — STATUS
   */

  if (parsed.data.status) {
    await logAction({
      restaurantId: order.restaurantId,
      userId: sessionUser?.id,
      action: `ORDER_${parsed.data.status}`,
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
      },
    });
  }

  /*
   * AUDIT LOG — PAYMENT
   */

  if (paymentChanged) {
    await logAction({
      restaurantId: order.restaurantId,
      userId: sessionUser?.id,
      action: "ORDER_PAYMENT_UPDATED",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        previousPaymentStatus: existing.paymentStatus,
        newPaymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
    });
  }

  /*
   * ADMIN NOTIFICATION — CANCELLATION
   */

  if (parsed.data.status === "CANCELLED") {
    await notifyAdmin(
      order.restaurantId,
      "ORDER_CANCELLED",
      {
        message: `Order ${order.orderNumber} was cancelled${
          parsed.data.cancelReason
            ? `: ${parsed.data.cancelReason}`
            : ""
        }`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      }
    );
  }

  return NextResponse.json({ order });
}