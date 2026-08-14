"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";

type Report = {
  overallSales: { revenue: number; orders: number; avgOrderValue: number };
  categorySales: { category: string; revenue: number; orders: number; percentage: number }[];
  bestSellers: {
    highestSelling: { name: string; qty: number; revenue: number } | null;
    lowestSelling: { name: string; qty: number; revenue: number } | null;
    mostProfitable: { name: string; qty: number; revenue: number } | null;
    mostPopularCategory: string | null;
  };
  salesTrend: { date: string; revenue: number; orders: number }[];
  bestDay: { date: string; revenue: number; orders: number } | null;
  peakHour: number;
  busiestWeekday: string | null;
  weekdayBreakdown: { day: string; count: number }[];
};

const RANGES = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "yearly", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

export function ReportsView({ restaurantId }: { restaurantId: string }) {
  const [range, setRange] = useState("weekly");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = new URLSearchParams({ restaurantId, range });
    if (range === "custom" && from) qs.set("from", from);
    if (range === "custom" && to) qs.set("to", to);
    fetch(`/api/reports?${qs.toString()}`)
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [restaurantId, range, from, to]);

  return (
    <div className="p-4 sm:p-6 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="font-display text-2xl font-semibold text-bn-charcoal">Reports & Analytics</h1>
        <button
          onClick={() => window.print()}
          className="rounded-full border border-bn-gold/40 px-4 py-2 text-sm font-semibold text-bn-charcoal hover:bg-bn-gold/10"
        >
          Print / Export
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              range === r.value ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30 text-bn-charcoal-soft"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="mt-3 flex flex-wrap gap-2 print:hidden">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-bn-gold/30 bg-bn-cream px-3 py-1.5 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-bn-gold/30 bg-bn-cream px-3 py-1.5 text-sm" />
        </div>
      )}

      {loading || !report ? (
        <p className="py-16 text-center text-sm text-bn-charcoal-soft">Loading report…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="border border-bn-gold/20 bg-bn-cream p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Revenue</p>
              <p className="mt-2 font-display text-2xl font-semibold text-bn-red">{formatCurrency(report.overallSales.revenue)}</p>
            </div>
            <div className="border border-bn-gold/20 bg-bn-cream p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Orders</p>
              <p className="mt-2 font-display text-2xl font-semibold text-bn-gold">{report.overallSales.orders}</p>
            </div>
            <div className="border border-bn-gold/20 bg-bn-cream p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Average Order Value</p>
              <p className="mt-2 font-display text-2xl font-semibold text-bn-charcoal">{formatCurrency(report.overallSales.avgOrderValue)}</p>
            </div>
          </div>

          <div className="mt-6 border border-bn-gold/20 bg-bn-cream p-5">
            <h2 className="font-display font-semibold text-bn-charcoal">Sales Trend</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#B8935A22" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Line type="monotone" dataKey="revenue" stroke="#C1272D" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="border border-bn-gold/20 bg-bn-cream p-5">
              <h2 className="font-display font-semibold text-bn-charcoal">Category Sales</h2>
              <div className="mt-3 space-y-2">
                {report.categorySales.length === 0 && <p className="text-sm text-bn-charcoal-soft">No sales in this range.</p>}
                {report.categorySales.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm">
                      <span>{c.category}</span>
                      <span className="text-bn-charcoal-soft">
                        {formatCurrency(c.revenue)} · {c.orders} orders · {c.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-bn-gold/10">
                      <div className="h-1.5 rounded-full bg-bn-gold" style={{ width: `${c.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-bn-gold/20 bg-bn-cream p-5">
              <h2 className="font-display font-semibold text-bn-charcoal">Best Sellers</h2>
              <div className="mt-3 space-y-2 text-sm">
                <p>Highest selling: <strong>{report.bestSellers.highestSelling?.name ?? "—"}</strong> ({report.bestSellers.highestSelling?.qty ?? 0} sold)</p>
                <p>Lowest selling: <strong>{report.bestSellers.lowestSelling?.name ?? "—"}</strong> ({report.bestSellers.lowestSelling?.qty ?? 0} sold)</p>
                <p>Most profitable: <strong>{report.bestSellers.mostProfitable?.name ?? "—"}</strong> ({formatCurrency(report.bestSellers.mostProfitable?.revenue ?? 0)})</p>
                <p>Most popular category: <strong>{report.bestSellers.mostPopularCategory ?? "—"}</strong></p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="border border-bn-gold/20 bg-bn-cream p-5">
              <h2 className="font-display font-semibold text-bn-charcoal">Busiest Weekday</h2>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.weekdayBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#B8935A22" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#B8935A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-sm text-bn-charcoal-soft">Busiest day: <strong>{report.busiestWeekday ?? "—"}</strong></p>
            </div>

            <div className="border border-bn-gold/20 bg-bn-cream p-5">
              <h2 className="font-display font-semibold text-bn-charcoal">Highlights</h2>
              <div className="mt-3 space-y-2 text-sm">
                <p>Best sales day: <strong>{report.bestDay ? `${formatDate(report.bestDay.date)} — ${formatCurrency(report.bestDay.revenue)}` : "—"}</strong></p>
                <p>Peak ordering hour: <strong>{report.peakHour}:00 – {report.peakHour + 1}:00</strong></p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
