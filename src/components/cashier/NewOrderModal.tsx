"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type MenuItem = { id: string; name: string; price: string; isAvailable: boolean };
type MenuCategory = { id: string; name: string; items: MenuItem[] };
type Table = { id: string; label: string; status: string };
type Line = { menuItemId: string; name: string; price: number; quantity: number };

export function NewOrderModal({
  restaurantId,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  onClose: () => void;
  onCreated: (orderNumber: string) => void;
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [orderType, setOrderType] = useState<"PICKUP" | "DINE_IN">("PICKUP");
  const [tableId, setTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/menu?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []));
    fetch(`/api/tables?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setTables(data.tables ?? []));
  }, [restaurantId]);

  function addLine(item: MenuItem) {
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) return prev.map((l) => (l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { menuItemId: item.id, name: item.name, price: parseFloat(item.price), quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, quantity: number) {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.menuItemId !== menuItemId) : prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l))
    );
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  async function submit() {
    if (lines.length === 0) return;
    if (orderType === "DINE_IN" && !tableId) {
      setError("Please select a table for a dine-in order.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        source: "WAITRESS_MANUAL",
        type: orderType,
        tableId: orderType === "DINE_IN" ? tableId : undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Could not create order.");
      return;
    }
    onCreated(data.order.orderNumber);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-bn-cream p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-bn-charcoal">New Order</h2>
          <button onClick={onClose} className="text-sm text-bn-charcoal-soft">Close ✕</button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setOrderType("PICKUP")}
            className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold ${
              orderType === "PICKUP" ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30"
            }`}
          >
            Pickup
          </button>
          <button
            onClick={() => setOrderType("DINE_IN")}
            className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold ${
              orderType === "DINE_IN" ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30"
            }`}
          >
            Dine In
          </button>
        </div>

        {orderType === "DINE_IN" && (
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            className="mb-4 w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Select a table…</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>{t.label} ({t.status.replace("_", " ")})</option>
            ))}
          </select>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (optional)"
            className="rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="max-h-72 overflow-y-auto pr-2">
            {categories.map((cat) => (
              <div key={cat.id} className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-bn-red">{cat.name}</p>
                {cat.items.map((item) => (
                  <button
                    key={item.id}
                    disabled={!item.isAvailable}
                    onClick={() => addLine(item)}
                    className="flex w-full items-center justify-between border-b border-bn-gold/10 py-1.5 text-left text-sm hover:text-bn-red disabled:opacity-40"
                  >
                    <span>{item.name}</span>
                    <span className="text-bn-gold">{formatCurrency(item.price)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Order</p>
            {lines.length === 0 ? (
              <p className="text-sm text-bn-charcoal-soft">Tap items to add them.</p>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.menuItemId} className="flex items-center justify-between text-sm">
                    <span>{line.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(line.menuItemId, line.quantity - 1)} className="h-6 w-6 rounded-full border text-xs">−</button>
                      <span className="w-4 text-center">{line.quantity}</span>
                      <button onClick={() => updateQty(line.menuItemId, line.quantity + 1)} className="h-6 w-6 rounded-full border text-xs">+</button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-bn-gold/20 pt-2 font-semibold">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>
            )}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <button
              onClick={submit}
              disabled={submitting || lines.length === 0}
              className="mt-4 w-full rounded-full bg-bn-red py-2.5 text-sm font-semibold text-bn-cream disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
