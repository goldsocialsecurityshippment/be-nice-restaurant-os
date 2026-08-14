import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function startOfRange(range: string, from?: string | null, to?: string | null) {
  const now = new Date();
  const end = to ? new Date(to) : now;
  let start: Date;

  switch (range) {
    case "daily":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "weekly":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "monthly":
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    case "yearly":
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "custom":
      start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 7);
  }
  return { start, end };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  const range = searchParams.get("range") ?? "weekly";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const { start, end } = startOfRange(range, from, to);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    },
    include: { items: true },
  });

  const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const orderCount = orders.length;
  const avgOrderValue = orderCount ? revenue / orderCount : 0;

  // Category breakdown
  const categoryMap = new Map<string, { revenue: number; orders: Set<string>; qty: number }>();
  const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
  const hourCounts = Array.from({ length: 24 }, () => 0);
  const weekdayCounts = Array.from({ length: 7 }, () => 0);
  const dailyMap = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().slice(0, 10);
    const existingDay = dailyMap.get(dateKey) ?? { revenue: 0, orders: 0 };
    existingDay.revenue += Number(order.total);
    existingDay.orders += 1;
    dailyMap.set(dateKey, existingDay);

    hourCounts[order.createdAt.getHours()] += 1;
    weekdayCounts[order.createdAt.getDay()] += 1;

    for (const item of order.items) {
      const category = item.categorySnapshot ?? "Uncategorized";
      const cat = categoryMap.get(category) ?? { revenue: 0, orders: new Set<string>(), qty: 0 };
      cat.revenue += Number(item.lineTotal);
      cat.orders.add(order.id);
      cat.qty += item.quantity;
      categoryMap.set(category, cat);

      const it = itemMap.get(item.menuItemId) ?? { name: item.nameSnapshot, qty: 0, revenue: 0 };
      it.qty += item.quantity;
      it.revenue += Number(item.lineTotal);
      itemMap.set(item.menuItemId, it);
    }
  }

  const categorySales = [...categoryMap.entries()]
    .map(([category, v]) => ({
      category,
      revenue: v.revenue,
      orders: v.orders.size,
      percentage: revenue > 0 ? (v.revenue / revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const itemsSorted = [...itemMap.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.qty - a.qty);
  const highestSelling = itemsSorted[0] ?? null;
  const lowestSelling = itemsSorted[itemsSorted.length - 1] ?? null;
  const mostProfitable = [...itemsSorted].sort((a, b) => b.revenue - a.revenue)[0] ?? null;
  const mostPopularCategory = categorySales[0]?.category ?? null;

  const dailySales = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }));

  const bestDay = dailySales.length ? [...dailySales].sort((a, b) => b.revenue - a.revenue)[0] : null;
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const busiestWeekdayIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts));

  return NextResponse.json({
    range: { start, end },
    overallSales: { revenue, orders: orderCount, avgOrderValue },
    categorySales,
    bestSellers: { highestSelling, lowestSelling, mostProfitable, mostPopularCategory },
    salesTrend: dailySales,
    bestDay,
    peakHour,
    busiestWeekday: weekdayCounts.some((c) => c > 0) ? WEEKDAYS[busiestWeekdayIndex] : null,
    hourlyBreakdown: hourCounts,
    weekdayBreakdown: weekdayCounts.map((count, i) => ({ day: WEEKDAYS[i], count })),
  });
}
