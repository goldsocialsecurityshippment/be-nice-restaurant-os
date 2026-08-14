import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "NEEDS_ATTENTION", "RESERVED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !["ADMIN", "MANAGER", "WAITRESS"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const seat = await prisma.tableSeat.update({
    where: { id },
    data: { status: parsed.data.status, updatedById: userId },
    include: { table: true, updatedBy: { select: { name: true } } },
  });

  publishEvent({ type: "TABLE_UPDATED", restaurantId: seat.table.restaurantId, tableId: seat.table.id });

  const staffName = seat.updatedBy?.name ?? "Staff";
  const label = `${seat.table.label} — Seat ${seat.seatNumber}`;

  if (parsed.data.status === "AVAILABLE") {
    await notifyAdmin(seat.table.restaurantId, "SEAT_AVAILABLE", {
      message: `${staffName} marked ${label} available`,
      metadata: { tableId: seat.table.id, seatId: seat.id },
    });
  } else if (parsed.data.status === "OCCUPIED") {
    await notifyAdmin(seat.table.restaurantId, "SEAT_OCCUPIED", {
      message: `${staffName} marked ${label} occupied`,
      metadata: { tableId: seat.table.id, seatId: seat.id },
    });
  }

  await logAction({
    restaurantId: seat.table.restaurantId,
    userId,
    action: `SEAT_${parsed.data.status}`,
    entityType: "TableSeat",
    entityId: seat.id,
    metadata: { table: seat.table.label, seatNumber: seat.seatNumber },
  });

  return NextResponse.json({ seat });
}
