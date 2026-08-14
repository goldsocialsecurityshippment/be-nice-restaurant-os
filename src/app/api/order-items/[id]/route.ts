import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recomputeOrderStatus } from "@/lib/orderStatus";
import { logAction } from "@/lib/audit";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PREPARING", "SERVED"],
  PREPARING: ["READY", "SERVED"],
  READY: ["SERVED"],
  SERVED: [],
};

const TIMESTAMP_FIELD: Record<string, string> = {
  PREPARING: "preparingAt",
  READY: "readyAt",
  SERVED: "servedAt",
};

const updateSchema = z.object({
  status: z.enum(["PENDING", "PREPARING", "READY", "SERVED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["ADMIN", "KITCHEN", "BAR", "WAITRESS"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.orderItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Order item not found" }, { status: 404 });

  const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      { error: `Cannot move item from ${existing.status} to ${parsed.data.status}` },
      { status: 409 }
    );
  }

  const data: Record<string, unknown> = { status: parsed.data.status };
  const tsField = TIMESTAMP_FIELD[parsed.data.status];
  if (tsField) data[tsField] = new Date();

  const item = await prisma.orderItem.update({ where: { id }, data });

  const order = await recomputeOrderStatus(prisma, item.orderId);

  await logAction({
    restaurantId: order?.restaurantId ?? "",
    userId: (session?.user as { id?: string } | undefined)?.id,
    action: `ITEM_${parsed.data.status}`,
    entityType: "OrderItem",
    entityId: item.id,
    metadata: { itemName: item.nameSnapshot },
  });

  return NextResponse.json({ item, order });
}
