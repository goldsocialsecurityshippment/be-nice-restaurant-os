"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useOrderEvents } from "@/lib/useOrderEvents";
import { formatTime } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";

type OrderItem = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  notes: string | null;
  status: string;
  dashboardGroupSnapshot: string | null;
};
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  table: { label: string } | null;
  items: OrderItem[];
};

type BarItem = { order: Order; item: OrderItem };

const ACTIVE_ORDER_STATUSES = "RECEIVED,ACCEPTED,PREPARING,READY";

export function BarBoard({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(() => {
    fetch(`/api/orders?restaurantId=${restaurantId}&status=${ACTIVE_ORDER_STATUSES}`)
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []));
  }, [restaurantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useOrderEvents(restaurantId, (event) => {
    setConnected(true);
    if (event.type === "ORDER_CREATED" || event.type === "ORDER_UPDATED") refresh();
  });

  async function updateItemStatus(itemId: string, status: string) {
    setOrders((prev) =>
      prev.map((o) => ({
        ...o,
        items: o.items.map((i) => (i.id === itemId ? { ...i, status } : i)),
      }))
    );
    const res = await fetch(`/api/order-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) refresh();
  }

  const barItems: BarItem[] = orders
    .filter((o) => o.status !== "RECEIVED")
    .flatMap((order) =>
      order.items.filter((item) => item.dashboardGroupSnapshot === "BAR").map((item) => ({ order, item }))
    );

  const pendingItems = barItems
    .filter((b) => b.item.status === "PENDING" || b.item.status === "PREPARING")
    .sort((a, b) => new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime());

  const readyItems = barItems
    .filter((b) => b.item.status === "READY")
    .sort((a, b) => new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime());

  return (
    <div className="min-h-screen bg-bn-charcoal text-bn-cream">
      <header className="flex items-center justify-between border-b border-bn-cream/10 px-6 py-4">
        <div>
          <h1 className="font-display text-xl font-semibold">Bar Dashboard</h1>
          <p className="text-xs text-bn-cream/50">
            {connected ? "● Live" : "○ Connecting…"} · {pendingItems.length + readyItems.length} active drinks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell restaurantId={restaurantId} variant="dark" />
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-bn-cream/60 hover:text-bn-cream">
            Sign out
          </button>
        </div>
      </header>

      <div className="grid gap-4 p-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 flex items-center justify-between font-display text-sm font-semibold uppercase tracking-wide text-bn-gold">
            Preparing
            <span className="rounded-full bg-bn-cream/10 px-2 py-0.5 text-xs">{pendingItems.length}</span>
          </h2>
          <div className="space-y-3">
            {pendingItems.length === 0 && (
              <p className="rounded border border-dashed border-bn-cream/10 p-6 text-center text-xs text-bn-cream/30">
                No drinks here
              </p>
            )}
            {pendingItems.map(({ order, item }) => (
              <div key={item.id} className="rounded-lg border border-bn-cream/10 bg-bn-cream/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold">{order.orderNumber}</span>
                  <span className="text-xs text-bn-cream/50">{formatTime(order.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-bn-gold">
                  {order.table ? order.table.label : "Pickup"}
                </p>
                <p className="mt-3 text-sm font-medium">
                  {item.nameSnapshot} × {item.quantity}
                </p>
                {item.notes && <p className="text-xs text-bn-cream/50">{item.notes}</p>}
                <button
                  onClick={() => updateItemStatus(item.id, item.status === "PENDING" ? "PREPARING" : "READY")}
                  className="mt-3 w-full rounded-full bg-bn-red py-2 text-xs font-semibold text-bn-cream transition hover:bg-bn-red-dark"
                >
                  {item.status === "PENDING" ? "Start Preparing" : "Mark Ready"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 flex items-center justify-between font-display text-sm font-semibold uppercase tracking-wide text-bn-gold">
            Ready
            <span className="rounded-full bg-bn-cream/10 px-2 py-0.5 text-xs">{readyItems.length}</span>
          </h2>
          <div className="space-y-3">
            {readyItems.length === 0 && (
              <p className="rounded border border-dashed border-bn-cream/10 p-6 text-center text-xs text-bn-cream/30">
                No drinks here
              </p>
            )}
            {readyItems.map(({ order, item }) => (
              <div key={item.id} className="rounded-lg border border-bn-cream/10 bg-bn-cream/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold">{order.orderNumber}</span>
                  <span className="text-xs text-bn-cream/50">{formatTime(order.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-green-400">
                  {order.table ? order.table.label : "Pickup"}
                </p>
                <p className="mt-3 text-sm font-medium">
                  {item.nameSnapshot} × {item.quantity}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
