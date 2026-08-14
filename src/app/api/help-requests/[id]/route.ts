import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { logAction } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]),
});

const STATUS_TIMESTAMP: Record<string, string> = {
  IN_PROGRESS: "inProgressAt",
  RESOLVED: "resolvedAt",
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["ADMIN", "WAITRESS"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { status: parsed.data.status };
  const tsField = STATUS_TIMESTAMP[parsed.data.status];
  if (tsField) data[tsField] = new Date();

  const helpRequest = await prisma.helpRequest.update({
    where: { id },
    data,
    include: { table: true, raisedBy: true },
  });

  if (parsed.data.status === "RESOLVED") {
    const stillNeedsHelp = await prisma.helpRequest.count({
      where: { tableId: helpRequest.tableId, status: { not: "RESOLVED" } },
    });
    if (stillNeedsHelp === 0) {
      await prisma.restaurantTable.update({
        where: { id: helpRequest.tableId },
        data: { status: "OCCUPIED" },
      });
    }
  }

  publishEvent({
    type: "TABLE_UPDATED",
    restaurantId: helpRequest.restaurantId,
    tableId: helpRequest.tableId,
  });
  publishEvent({
    type: "HELP_REQUEST_UPDATED",
    restaurantId: helpRequest.restaurantId,
    helpRequestId: helpRequest.id,
    status: helpRequest.status,
  });

  await logAction({
    restaurantId: helpRequest.restaurantId,
    userId: (session?.user as { id?: string } | undefined)?.id,
    action: `HELP_REQUEST_${parsed.data.status}`,
    entityType: "HelpRequest",
    entityId: helpRequest.id,
    metadata: { table: helpRequest.table.label },
  });

  return NextResponse.json({ helpRequest });
}
