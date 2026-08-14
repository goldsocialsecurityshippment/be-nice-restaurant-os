"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useOrderEvents } from "@/lib/useOrderEvents";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { NewOrderModal } from "@/components/cashier/NewOrderModal";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
  table: { label: string } | null;
  customerName: string | null;
  items: { id: string; nameSnapshot: string; quantity: number }[];
};

const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE_MONEY", "OTHER"];

export function CashierBoard({ restaurantId }: { restaurantId: string }) {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(() => {
    fetch(`/api/orders?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setRecentOrders((data.orders ?? []).slice(0, 15)));
  }, [restaurantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useOrderEvents(restaurantId, (event) => {
    setConnected(true);
    if (event.type === "ORDER_CREATED" || event.type === "ORDER_UPDATED") refresh();
  });

  async function lookupOrder() {
    setSearchError(null);
    setFoundOrder(null);
    if (!searchQuery.trim()) return;
    const res = await fetch(`/api/orders?restaurantId=${restaurantId}&orderNumber=${encodeURIComponent(searchQuery.trim())}`);
    const data = await res.json();
    const order = data.orders?.[0];
    if (!order) {
      setSearchError("No order found with that number.");
      return;
    }
    setFoundOrder(order);
  }

  async function setPayment(
  order: Order,
  paymentStatus: string,
  paymentMethod?: string
) {
  const res = await fetch(`/api/orders/${order.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentStatus,
      paymentMethod,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    alert(data.error ?? "Unable to update payment.");
    return;
  }

  if (data.order) {
    setFoundOrder(data.order);
  }

  refresh();
}

  return (
    <div className="min-h-screen bg-bn-cream">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-bn-gold/20 bg-bn-charcoal px-4 py-3 text-bn-cream sm:px-6">
        <div>
          <h1 className="font-display text-lg font-semibold sm:text-xl">Cashier Dashboard</h1>
          <p className="text-xs text-bn-cream/50">{connected ? "● Live" : "○ Connecting…"}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell restaurantId={restaurantId} variant="dark" />
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-bn-cream/60 hover:text-bn-cream">
            Sign out
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowNewOrder(true)}
            className="rounded-full bg-bn-red px-5 py-2.5 text-sm font-semibold text-bn-cream hover:bg-bn-red-dark"
          >
            + New Order
          </button>
          {justCreated && (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              Order {justCreated} created ✓
            </span>
          )}
        </div>

        {/* Order lookup */}
        <div className="mt-6 border border-bn-gold/20 bg-bn-cream p-4">
          <h2 className="font-display font-semibold text-bn-charcoal">Order Lookup</h2>
          <div className="mt-2 flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupOrder()}
              placeholder="Enter order number (e.g. BN-20260807-000125)"
              className="flex-1 rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
            />
            <button onClick={lookupOrder} className="rounded-full bg-bn-charcoal px-4 py-2 text-sm font-semibold text-bn-cream">
              Search
            </button>
          </div>
          {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}

          {foundOrder && (
            <div className="mt-4 border-t border-bn-gold/20 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display font-semibold text-bn-charcoal">{foundOrder.orderNumber}</p>
                  <p className="text-xs text-bn-charcoal-soft">
                    {foundOrder.table?.label ?? foundOrder.customerName ?? "Pickup"} · {formatDateTime(foundOrder.createdAt)}
                  </p>
                </div>
                <StatusBadge status={foundOrder.status} />
              </div>
              <ul className="mt-2 space-y-0.5 text-sm text-bn-charcoal-soft">
                {foundOrder.items.map((i) => (
                  <li key={i.id}>{i.nameSnapshot} × {i.quantity}</li>
                ))}
              </ul>
              <p className="mt-2 font-semibold text-bn-gold">{formatCurrency(foundOrder.total)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">
                  Payment: {foundOrder.paymentStatus}
                </span>
                {foundOrder.paymentStatus !== "PAID" &&
                  PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayment(foundOrder, "PAID", m)}
                      className="rounded-full border border-bn-gold/40 px-3 py-1 text-xs font-semibold text-bn-charcoal hover:bg-bn-gold/10"
                    >
                      Mark Paid ({m.replace("_", " ")})
                    </button>
                  ))}
                <a
                  href={`/api/orders/${foundOrder.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-bn-charcoal px-3 py-1 text-xs font-semibold text-bn-cream hover:bg-bn-red"
                >
                  Print Receipt
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="mt-6">
          <h2 className="font-display font-semibold text-bn-charcoal">Recent Orders</h2>
          <div className="mt-3 overflow-x-auto rounded border border-bn-gold/20">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-bn-cream-deep text-left text-xs uppercase tracking-wide text-bn-charcoal-soft">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Customer/Table</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-bn-gold/10 bg-bn-cream">
                    <td className="px-3 py-2 font-medium">{order.orderNumber}</td>
                    <td className="px-3 py-2">{order.table?.label ?? order.customerName ?? "Pickup"}</td>
                    <td className="px-3 py-2 font-semibold text-bn-gold">{formatCurrency(order.total)}</td>
                    <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
                  <td className="px-3 py-2 text-xs">
  <div className="flex flex-col gap-1">
    <span
      className={
        order.paymentStatus === "PAID"
          ? "font-semibold text-green-700"
          : "font-semibold text-red-600"
      }
    >
      {order.paymentStatus}
    </span>

    {order.paymentStatus !== "PAID" && (
      <div className="flex flex-wrap gap-1">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method}
            onClick={() => setPayment(order, "PAID", method)}
            className="rounded-full border border-bn-gold/40 px-2 py-1 text-[11px] font-semibold text-bn-charcoal hover:bg-bn-gold/10"
          >
            {method.replace("_", " ")}
          </button>
        ))}
      </div>
    )}
  </div>
</td>
                    <td className="px-3 py-2">
                      <a href={`/api/orders/${order.id}/receipt`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-bn-red hover:underline">
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-bn-charcoal-soft">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showNewOrder && (
        <NewOrderModal
          restaurantId={restaurantId}
          onClose={() => setShowNewOrder(false)}
          onCreated={(orderNumber) => {
            setShowNewOrder(false);
            setJustCreated(orderNumber);
            refresh();
            setTimeout(() => setJustCreated(null), 5000);
          }}
        />
      )}
    </div>
  );
}
