import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const staff = await prisma.user.findMany({
    where: { restaurantId, role: { in: ["ADMIN", "MANAGER", "KITCHEN", "BAR", "WAITRESS", "CASHIER"] } },
    select: { id: true, name: true, role: true, isActive: true },
  });

  const logs = await prisma.auditLog.findMany({
    where: { restaurantId, userId: { in: staff.map((s) => s.id) } },
  });

  const ordersServed = await prisma.order.groupBy({
    by: ["servedById"],
    where: { restaurantId, servedById: { not: null } },
    _count: { _all: true },
  });
  const ordersCreated = await prisma.order.groupBy({
    by: ["createdById"],
    where: { restaurantId, createdById: { not: null } },
    _count: { _all: true },
  });

  const performance = staff.map((member) => {
    const memberLogs = logs.filter((l) => l.userId === member.id);
    const accepted = memberLogs.filter((l) => l.action === "ORDER_ACCEPTED").length;
    const prepared = memberLogs.filter((l) => l.action === "ITEM_READY").length;
    const helpRequestsHandled = memberLogs.filter((l) => l.action.startsWith("HELP_REQUEST_")).length;
    const servedCount = ordersServed.find((o) => o.servedById === member.id)?._count._all ?? 0;
    const createdCount = ordersCreated.find((o) => o.createdById === member.id)?._count._all ?? 0;

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      isActive: member.isActive,
      ordersCreated: createdCount,
      ordersAccepted: accepted,
      itemsPrepared: prepared,
      ordersServed: servedCount,
      helpRequestsHandled,
      totalActions: memberLogs.length,
    };
  });

  return NextResponse.json({ performance });
}
