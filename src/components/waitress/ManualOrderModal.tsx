"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type MenuItem = { id: string; name: string; price: string; isAvailable: boolean };
type MenuCategory = { id: string; name: string; items: MenuItem[] };
type Table = { id: string; label: string };

type Line = { menuItemId: string; name: string; price: number; quantity: number; notes?: string };

export function ManualOrderModal({
  restaurantId,
  table,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  table: Table;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [orderType, setOrderType] = useState<"DINE_IN" | "PICKUP">("DINE_IN");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/menu?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []));
  }, [restaurantId]);

  function addLine(item: MenuItem) {
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) => (l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
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
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        source: "WAITRESS_MANUAL",
        type: orderType,
        tableId: orderType === "DINE_IN" ? table.id : undefined,
        items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, notes: l.notes })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Could not create order.");
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-bn-cream p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-bn-charcoal">New Order — {table.label}</h2>
          <button onClick={onClose} className="text-sm text-bn-charcoal-soft">
            Close ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setOrderType("DINE_IN")}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${
              orderType === "DINE_IN" ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30"
            }`}
          >
            Dine In ({table.label})
          </button>
          <button
            onClick={() => setOrderType("PICKUP")}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${
              orderType === "PICKUP" ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30"
            }`}
          >
            Pickup
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="max-h-96 overflow-y-auto pr-2">
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
              <p className="text-sm text-bn-charcoal-soft">Tap items on the left to add them.</p>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.menuItemId} className="flex items-center justify-between text-sm">
                    <span>{line.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(line.menuItemId, line.quantity - 1)} className="h-6 w-6 rounded-full border text-xs">
                        −
                      </button>
                      <span className="w-4 text-center">{line.quantity}</span>
                      <button onClick={() => updateQty(line.menuItemId, line.quantity + 1)} className="h-6 w-6 rounded-full border text-xs">
                        +
                      </button>
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
              {submitting ? "Sending to kitchen…" : "Send to Kitchen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
