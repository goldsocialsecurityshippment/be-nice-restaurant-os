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
  const rangeDays = parseInt(searchParams.get("days") ?? "7", 10);
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeStart = new Date(startOfToday);
  rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));

  const [todaysOrders, pendingOrders, completedToday, rangeOrders] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startOfToday }, status: { not: "CANCELLED" } },
      include: { items: true },
    }),
    prisma.order.count({
      where: { restaurantId, status: { in: ["RECEIVED", "ACCEPTED", "PREPARING", "READY"] } },
    }),
    prisma.order.count({
      where: { restaurantId, status: { in: ["COMPLETED", "SERVED"] }, createdAt: { gte: startOfToday } },
    }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: rangeStart }, status: { not: "CANCELLED" } },
      include: { items: true },
    }),
  ]);

  const todaysSales = todaysOrders.reduce((sum, o) => sum + Number(o.total), 0);

  // Most ordered meals (by quantity) over the selected range.
  const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of rangeOrders) {
    for (const item of order.items) {
      const existing = itemCounts.get(item.menuItemId) ?? { name: item.nameSnapshot, qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += Number(item.lineTotal);
      itemCounts.set(item.menuItemId, existing);
    }
  }
  const topItems = [...itemCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);

  // Busy hours histogram (0-23) over the range.
  const hourCounts = Array.from({ length: 24 }, () => 0);
  for (const order of rangeOrders) {
    hourCounts[new Date(order.createdAt).getHours()] += 1;
  }

  // Daily sales trend for the range.
  const dailyMap = new Map<string, number>();
  for (const order of rangeOrders) {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(order.total));
  }
  const dailySales = [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({
    date,
    total,
  }));

  return NextResponse.json({
    todaysSales,
    todaysOrderCount: todaysOrders.length,
    pendingOrders,
    completedToday,
    topItems,
    busyHours: hourCounts,
    dailySales,
  });
}
