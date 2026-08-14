"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";

type LogEntry = {
  id: string;
  action: string;
  entityType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; role: string } | null;
};

const ENTITY_TYPES = ["Order", "OrderItem", "HelpRequest", "RestaurantTable", "MenuItem", "User"];

export function ActivityCenter({ restaurantId }: { restaurantId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const qs = new URLSearchParams({ restaurantId });
    if (entityType) qs.set("eventType", entityType);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    fetch(`/api/activity?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []));
  }, [restaurantId, entityType, from, to]);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-semibold text-bn-charcoal">Activity Center</h1>
      <p className="text-sm text-bn-charcoal-soft">A permanent log of orders, staff actions, and system events.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded border border-bn-gold/30 bg-bn-cream px-3 py-1.5 text-sm"
        >
          <option value="">All event types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-bn-gold/30 bg-bn-cream px-3 py-1.5 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-bn-gold/30 bg-bn-cream px-3 py-1.5 text-sm" />
      </div>

      <div className="mt-5 overflow-x-auto rounded border border-bn-gold/20">
        <table className="w-full text-sm">
          <thead className="bg-bn-cream-deep text-left text-xs uppercase tracking-wide text-bn-charcoal-soft">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-bn-gold/10 bg-bn-cream">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-bn-charcoal-soft">{formatDateTime(log.createdAt)}</td>
                <td className="px-3 py-2">{log.user ? `${log.user.name} (${log.user.role})` : "System"}</td>
                <td className="px-3 py-2">{log.action.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 text-xs text-bn-charcoal-soft">{log.entityType}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-bn-charcoal-soft">No activity recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
