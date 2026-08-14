"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { useOrderEvents } from "@/lib/useOrderEvents";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Analytics = {
  todaysSales: number;
  todaysOrderCount: number;
  pendingOrders: number;
  completedToday: number;
  topItems: { name: string; qty: number; revenue: number }[];
  busyHours: number[];
  dailySales: { date: string; total: number }[];
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  table: { label: string } | null;
  items: { id: string; nameSnapshot: string; quantity: number }[];
};

export function AdminOverview({
  restaurantId,
  restaurantName,
  initialRecentOrders,
}: {
  restaurantId: string;
  restaurantName: string;
  initialRecentOrders: Order[];
}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>(initialRecentOrders);

  const refresh = useCallback(() => {
    fetch(`/api/analytics?restaurantId=${restaurantId}&days=7`)
      .then((r) => r.json())
      .then(setAnalytics);
    fetch(`/api/orders?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setRecentOrders((data.orders ?? []).slice(0, 10)));
  }, [restaurantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useOrderEvents(restaurantId, (event) => {
    if (event.type === "ORDER_CREATED" || event.type === "ORDER_UPDATED") refresh();
  });

  const busyHoursData = analytics?.busyHours.map((count, hour) => ({ hour: `${hour}:00`, count })) ?? [];

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-bn-charcoal">{restaurantName} — Overview</h1>
      <p className="text-sm text-bn-charcoal-soft">A live snapshot of today&apos;s business.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Today's Sales" value={analytics ? formatCurrency(analytics.todaysSales) : "…"} accent="red" />
        <Card label="Today's Orders" value={analytics?.todaysOrderCount ?? "…"} accent="gold" />
        <Card label="Pending Orders" value={analytics?.pendingOrders ?? "…"} accent="charcoal" />
        <Card label="Completed Today" value={analytics?.completedToday ?? "…"} accent="green" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <h2 className="font-display font-semibold text-bn-charcoal">Sales — Last 7 Days</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.dailySales ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#B8935A22" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="total" stroke="#C1272D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <h2 className="font-display font-semibold text-bn-charcoal">Busy Hours — Last 7 Days</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={busyHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#B8935A22" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#B8935A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <h2 className="font-display font-semibold text-bn-charcoal">Most Ordered Meals</h2>
          <div className="mt-3 space-y-2">
            {analytics?.topItems.length ? (
              analytics.topItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-bn-charcoal-soft">
                    {item.qty} sold · {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-bn-charcoal-soft">No orders yet this week.</p>
            )}
          </div>
        </div>

        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <h2 className="font-display font-semibold text-bn-charcoal">Recent Orders</h2>
          <div className="mt-3 space-y-2">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between border-b border-bn-gold/10 pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-bn-charcoal-soft">
                    {order.table?.label ?? "Pickup"} · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-bn-gold">{formatCurrency(order.total)}</p>
                  <StatusBadge status={order.status} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "red" | "gold" | "charcoal" | "green";
}) {
  const accents = {
    red: "border-bn-red/30 text-bn-red",
    gold: "border-bn-gold/40 text-bn-gold",
    charcoal: "border-bn-charcoal/20 text-bn-charcoal",
    green: "border-green-300 text-green-700",
  };
  return (
    <div className={`border bg-bn-cream p-5 ${accents[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
