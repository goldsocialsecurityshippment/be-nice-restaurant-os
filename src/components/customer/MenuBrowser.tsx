"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { DishImage } from "@/components/shared/DishImage";
import { formatCurrency } from "@/lib/utils";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  isAvailable: boolean;
};

type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  items: MenuItem[];
};

export function MenuBrowser({ restaurantId, tableCode }: { restaurantId: string; tableCode?: string }) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();

  useEffect(() => {
    fetch(`/api/menu?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories ?? []);
        if (data.categories?.length) setActiveCategory(data.categories[0].id);
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) {
    return <div className="py-24 text-center text-bn-charcoal-soft">Loading the menu…</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="py-24 text-center text-bn-charcoal-soft">
        No menu items yet. Add some from the admin dashboard.
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
      <div>
        {tableCode && (
          <div className="mb-6 rounded-lg border border-bn-gold/40 bg-bn-gold/10 px-4 py-3 text-sm text-bn-charcoal">
            You&apos;re ordering for your table — it&apos;ll be sent straight to the kitchen once you check out.
          </div>
        )}

        {/* Category tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeCategory === cat.id
                  ? "border-bn-red bg-bn-red text-bn-cream"
                  : "border-bn-gold/30 text-bn-charcoal-soft hover:border-bn-red/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {categories
          .filter((cat) => cat.id === activeCategory)
          .map((cat) => (
            <div key={cat.id} className="grid gap-4 sm:grid-cols-2">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 border border-bn-gold/20 bg-bn-cream p-3"
                >
                  <DishImage src={item.imageUrl} alt={item.name} className="h-20 w-20 shrink-0" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-medium text-bn-charcoal">{item.name}</h3>
                      <span className="whitespace-nowrap text-sm font-semibold text-bn-gold">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-bn-charcoal-soft line-clamp-2">{item.description}</p>
                    )}
                    <div className="mt-auto pt-2">
                      {item.isAvailable ? (
                        <button
                          onClick={() =>
                            cart.addItem({
                              menuItemId: item.id,
                              name: item.name,
                              price: parseFloat(item.price),
                              imageUrl: item.imageUrl,
                            })
                          }
                          className="rounded-full bg-bn-charcoal px-3 py-1.5 text-xs font-semibold text-bn-cream transition hover:bg-bn-red"
                        >
                          Add to order
                        </button>
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-wide text-red-500">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Desktop cart sidebar */}
      <div className="hidden lg:block">
        <CartPanel restaurantId={restaurantId} tableCode={tableCode} />
      </div>

      {/* Mobile floating cart button + drawer */}
      {cart.itemCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-bn-red px-6 py-3 text-sm font-semibold text-bn-cream shadow-xl lg:hidden"
        >
          View order ({cart.itemCount}) · {formatCurrency(cart.subtotal)}
        </button>
      )}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" onClick={() => setCartOpen(false)}>
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-bn-cream p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-end">
              <button onClick={() => setCartOpen(false)} className="text-sm text-bn-charcoal-soft">
                Close ✕
              </button>
            </div>
            <CartPanel restaurantId={restaurantId} tableCode={tableCode} />
          </div>
        </div>
      )}
    </div>
  );
}

function CartPanel({ restaurantId, tableCode }: { restaurantId: string; tableCode?: string }) {
  const cart = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  // No default when arriving without a table QR — the customer must
  // explicitly choose Pickup or Dine In before they can place the order.
  const [orderType, setOrderType] = useState<"TABLE" | "PICKUP" | null>(tableCode ? "TABLE" : null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitOrder() {
    setError(null);
    if (cart.lines.length === 0) return;
    if (!orderType) {
      setError("Please choose Pickup or Dine In before placing your order.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          source: tableCode ? "TABLE_QR" : "WEBSITE",
          type: orderType === "TABLE" ? "DINE_IN" : "PICKUP",
          tableCode: orderType === "TABLE" ? tableCode : undefined,
          customerName: name || undefined,
          customerPhone: phone || undefined,
          specialInstructions: instructions || undefined,
          items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, notes: l.notes })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.formErrors?.[0] ?? data.error ?? "Something went wrong placing your order.");
        return;
      }
      cart.clear();
      router.push(`/order/confirmation/${data.order.orderNumber}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-bn-gold/30 bg-bn-cream p-5">
      <h2 className="font-display text-lg font-semibold text-bn-charcoal">Your Order</h2>

      {cart.lines.length === 0 ? (
        <p className="mt-4 text-sm text-bn-charcoal-soft">Your order is empty. Add items from the menu.</p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {cart.lines.map((line) => (
              <div key={line.menuItemId} className="flex items-start justify-between gap-2 text-sm">
                <div className="flex-1">
                  <p className="font-medium text-bn-charcoal">{line.name}</p>
                  <input
                    type="text"
                    placeholder="Special instructions (e.g. no pepper)"
                    value={line.notes ?? ""}
                    onChange={(e) => cart.updateNotes(line.menuItemId, e.target.value)}
                    className="mt-1 w-full border-b border-bn-gold/30 bg-transparent text-xs text-bn-charcoal-soft outline-none placeholder:text-bn-charcoal-soft/50"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => cart.updateQuantity(line.menuItemId, line.quantity - 1)}
                    className="h-6 w-6 rounded-full border border-bn-gold/40 text-xs"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-xs">{line.quantity}</span>
                  <button
                    onClick={() => cart.updateQuantity(line.menuItemId, line.quantity + 1)}
                    className="h-6 w-6 rounded-full border border-bn-gold/40 text-xs"
                  >
                    +
                  </button>
                </div>
                <span className="w-16 shrink-0 text-right font-semibold text-bn-gold">
                  {formatCurrency(line.price * line.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between border-t border-bn-gold/20 pt-3 font-semibold">
            <span>Subtotal</span>
            <span>{formatCurrency(cart.subtotal)}</span>
          </div>

          {!tableCode && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">
                How would you like your order? *
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType("PICKUP")}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${
                    orderType === "PICKUP" ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30"
                  }`}
                >
                  Pickup
                </button>
                <button
                  onClick={() => setOrderType("TABLE")}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${
                    orderType === "TABLE" ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30"
                  }`}
                >
                  Dining In
                </button>
              </div>
              {orderType === null && (
                <p className="mt-1 text-[11px] text-bn-charcoal-soft">Please select one to continue.</p>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm outline-none"
            />
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Order-wide notes (optional)"
              className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm outline-none"
              rows={2}
            />
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <button
            onClick={submitOrder}
            disabled={submitting || orderType === null}
            className="mt-4 w-full rounded-full bg-bn-red py-3 text-sm font-semibold text-bn-cream transition hover:bg-bn-red-dark disabled:opacity-60"
          >
            {submitting ? "Placing order…" : "Place Order"}
          </button>
        </>
      )}
    </div>
  );
}
