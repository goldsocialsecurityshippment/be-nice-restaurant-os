"use client";

import { useCallback, useEffect, useState } from "react";
import { useOrderEvents } from "@/lib/useOrderEvents";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  source: string;
  total: string;
  createdAt: string;
  cancelReason: string | null;
  table: { label: string } | null;
  customerName: string | null;
  items: { id: string; nameSnapshot: string; quantity: number }[];
};

const FILTERS: { label: string; statuses?: string }[] = [
  { label: "All" },
  { label: "Pending", statuses: "RECEIVED,ACCEPTED,PREPARING,READY" },
  { label: "Completed", statuses: "COMPLETED,SERVED" },
  { label: "Cancelled", statuses: "CANCELLED" },
];

export function OrderManager({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState(FILTERS[0]);

  const refresh = useCallback(() => {
    const qs = new URLSearchParams({ restaurantId });
    if (filter.statuses) qs.set("status", filter.statuses);
    fetch(`/api/orders?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []));
  }, [restaurantId, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useOrderEvents(restaurantId, (event) => {
    if (event.type === "ORDER_CREATED" || event.type === "ORDER_UPDATED") refresh();
  });

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-semibold text-bn-charcoal">Orders</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
              filter.label === f.label ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30 text-bn-charcoal-soft"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded border border-bn-gold/20">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-bn-cream-deep text-left text-xs uppercase tracking-wide text-bn-charcoal-soft">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Customer / Table</th>
              <th className="px-3 py-2">Items</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-bn-gold/10 bg-bn-cream">
                <td className="px-3 py-2 font-medium">{order.orderNumber}</td>
                <td className="px-3 py-2 text-xs text-bn-charcoal-soft">{order.type === "DINE_IN" ? "Dine In" : "Pickup"}</td>
                <td className="px-3 py-2">{order.table?.label ?? order.customerName ?? "Pickup"}</td>
                <td className="px-3 py-2 text-xs text-bn-charcoal-soft">
                  {order.items.map((i) => `${i.nameSnapshot} ×${i.quantity}`).join(", ")}
                </td>
                <td className="px-3 py-2 font-semibold text-bn-gold">{formatCurrency(order.total)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={order.status} />
                  {order.status === "CANCELLED" && order.cancelReason && (
                    <p className="mt-0.5 text-[10px] text-bn-charcoal-soft">{order.cancelReason}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-bn-charcoal-soft">{formatDateTime(order.createdAt)}</td>
                <td className="px-3 py-2">
                  <a
                    href={`/api/orders/${order.id}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-bn-red hover:underline"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-bn-charcoal-soft">
                  No orders match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
