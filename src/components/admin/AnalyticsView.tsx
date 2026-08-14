"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { formatCurrency } from "@/lib/utils";

type Analytics = {
  todaysSales: number;
  todaysOrderCount: number;
  topItems: { name: string; qty: number; revenue: number }[];
  busyHours: number[];
  dailySales: { date: string; total: number }[];
};

export function AnalyticsView({ restaurantId }: { restaurantId: string }) {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch(`/api/analytics?restaurantId=${restaurantId}&days=${days}`)
      .then((r) => r.json())
      .then(setAnalytics);
  }, [restaurantId, days]);

  const rangeRevenue = analytics?.dailySales.reduce((sum, d) => sum + d.total, 0) ?? 0;
  const busyHoursData = analytics?.busyHours.map((count, hour) => ({ hour: `${hour}:00`, count })) ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-bn-charcoal">Analytics &amp; Reports</h1>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="rounded border border-bn-gold/30 bg-bn-cream px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Revenue in range</p>
          <p className="mt-2 font-display text-2xl font-semibold text-bn-red">{formatCurrency(rangeRevenue)}</p>
        </div>
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Orders today</p>
          <p className="mt-2 font-display text-2xl font-semibold text-bn-gold">{analytics?.todaysOrderCount ?? "…"}</p>
        </div>
      </div>

      <div className="mt-6 border border-bn-gold/20 bg-bn-cream p-5">
        <h2 className="font-display font-semibold text-bn-charcoal">Sales Trend</h2>
        <div className="mt-4 h-64">
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <h2 className="font-display font-semibold text-bn-charcoal">Busy Hours</h2>
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

        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <h2 className="font-display font-semibold text-bn-charcoal">Top Sellers</h2>
          <div className="mt-3 space-y-2">
            {analytics?.topItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span className="text-bn-charcoal-soft">
                  {item.qty} sold · {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
