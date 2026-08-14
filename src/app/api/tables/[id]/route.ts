import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

const updateSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "NEEDS_ATTENTION", "RESERVED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["ADMIN", "MANAGER", "WAITRESS"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Waitress can only toggle status (e.g. flag "needs attention" / free up a table), not edit table config.
  const data = role === "WAITRESS" ? { status: parsed.data.status } : parsed.data;

  const table = await prisma.restaurantTable.update({ where: { id }, data });
  publishEvent({ type: "TABLE_UPDATED", restaurantId: table.restaurantId, tableId: table.id });

  if (parsed.data.status === "AVAILABLE") {
    await notifyAdmin(table.restaurantId, "TABLE_AVAILABLE", {
      message: `${table.label} is now available`,
      metadata: { tableId: table.id },
    });
  } else if (parsed.data.status === "OCCUPIED") {
    await notifyAdmin(table.restaurantId, "TABLE_OCCUPIED", {
      message: `${table.label} is now occupied`,
      metadata: { tableId: table.id },
    });
  }

  if (parsed.data.status) {
    await logAction({
      restaurantId: table.restaurantId,
      userId: (session?.user as { id?: string } | undefined)?.id,
      action: `TABLE_${parsed.data.status}`,
      entityType: "RestaurantTable",
      entityId: table.id,
      metadata: { label: table.label },
    });
  }

  return NextResponse.json({ table });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const table = await prisma.restaurantTable.delete({ where: { id } });
  return NextResponse.json({ success: true, tableId: table.id });
}
