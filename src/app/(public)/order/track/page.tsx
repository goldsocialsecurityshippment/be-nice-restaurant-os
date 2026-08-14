"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackOrderLookupPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = orderNumber.trim().toUpperCase();

    if (!value) {
      setError("Please enter your order number.");
      return;
    }

    setError("");
    router.push(`/order/track/${encodeURIComponent(value)}`);
  }

  return (
    <main className="min-h-[70vh] px-5 py-16">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-bn-gold">
            Be-Nice Catering Services
          </p>

          <h1 className="mt-3 font-display text-3xl font-semibold text-bn-charcoal">
            Track Your Order
          </h1>

          <p className="mt-3 text-sm leading-6 text-bn-charcoal-soft">
            Enter the order number you received after placing your order to
            see its current status.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-bn-gold/20 bg-bn-cream-deep/30 p-6 shadow-sm"
        >
          <label
            htmlFor="orderNumber"
            className="text-sm font-semibold text-bn-charcoal"
          >
            Order Number
          </label>

          <input
            id="orderNumber"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="e.g. BN-20260810-000107"
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-bn-gold/30 bg-white px-4 py-3 text-sm text-bn-charcoal outline-none transition focus:border-bn-red"
          />

          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-full bg-bn-red px-5 py-3 text-sm font-semibold text-bn-cream transition hover:bg-bn-red-dark"
          >
            Track Order
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-bn-charcoal-soft">
          Your order number can be found on your order confirmation.
        </p>
      </div>
    </main>
  );
}