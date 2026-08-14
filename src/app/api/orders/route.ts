import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { publishEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/notifications";
import { auth } from "@/lib/auth";

const orderItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(280).optional(),
});

const createOrderSchema = z.object({
  restaurantId: z.string(),
  source: z.enum(["TABLE_QR", "WAITRESS_MANUAL", "PICKUP", "WEBSITE"]),
  // Explicit order type from the customer/waitress — no longer inferred
  // from whether a table happens to be present, since a walk-in customer
  // choosing "Dine In" before being seated has no tableCode yet.
  type: z.enum(["DINE_IN", "PICKUP"]),
  tableCode: z.string().optional(),
  tableId: z.string().optional(),
  customerName: z.string().max(120).optional(),
  customerPhone: z.string().max(30).optional(),
  customerEmail: z.string().email().max(160).optional(),
  specialInstructions: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    let tableId = data.tableId ?? null;
    if (data.tableCode && !tableId) {
      const qr = await prisma.qRCode.findUnique({ where: { code: data.tableCode } });
      if (!qr) return NextResponse.json({ error: "Invalid table QR code" }, { status: 404 });
      tableId = qr.tableId;
    }

    if (data.type === "DINE_IN" && !tableId) {
      return NextResponse.json(
        { error: "Please select a table, or scan the QR code at your table, for dine-in orders." },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.findUnique({ where: { restaurantId: data.restaurantId } });
    if (settings && !settings.acceptingOrders) {
      return NextResponse.json({ error: "Restaurant is not currently accepting orders" }, { status: 403 });
    }

    const menuItemIds = data.items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId: data.restaurantId },
      include: { station: true, category: true },
    });
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    for (const item of data.items) {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        return NextResponse.json({ error: `Menu item ${item.menuItemId} not found` }, { status: 404 });
      }
      if (!menuItem.isAvailable) {
        return NextResponse.json({ error: `${menuItem.name} is currently unavailable` }, { status: 409 });
      }
    }

    let subtotal = 0;
    const orderItemsData = data.items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      const price = Number(menuItem.price);
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;
      return {
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        priceSnapshot: price,
        quantity: item.quantity,
        notes: item.notes,
        lineTotal,
        stationSnapshot: menuItem.station?.name ?? null,
        dashboardGroupSnapshot: menuItem.station?.dashboardGroup ?? "KITCHEN",
        categorySnapshot: menuItem.category?.name ?? null,
      };
    });

    const session = await auth().catch(() => null);
    const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

    const orderNumber = await generateOrderNumber(prisma, data.restaurantId);

    const order = await prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        orderNumber,
        source: data.source,
        type: data.type,
        tableId: tableId ?? undefined,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        specialInstructions: data.specialInstructions,
        subtotal,
        total: subtotal,
        createdById: createdById ?? undefined,
        items: { create: orderItemsData },
        statusHistory: { create: { status: "RECEIVED" } },
      },
      include: { items: true, table: true },
    });

    if (tableId) {
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });
      publishEvent({ type: "TABLE_UPDATED", restaurantId: data.restaurantId, tableId });
    }

    publishEvent({ type: "ORDER_CREATED", restaurantId: data.restaurantId, orderId: order.id });

    await notifyAdmin(data.restaurantId, "NEW_ORDER", {
      message: `New order ${order.orderNumber}${order.table ? ` — ${order.table.label}` : " — Pickup"}`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("Failed to create order", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  const status = searchParams.get("status");
  const tableId = searchParams.get("tableId");
  const orderNumber = searchParams.get("orderNumber");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      ...(status ? { status: { in: status.split(",") as never[] } } : {}),
      ...(tableId ? { tableId } : {}),
      ...(orderNumber ? { orderNumber } : {}),
    },
    include: { items: true, table: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ orders });
}
