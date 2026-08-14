"use client";

import { useState } from "react";

const REASONS: { value: string; label: string }[] = [
  { value: "CUSTOMER_COMPLAINT", label: "Customer Complaint" },
  { value: "FOOD_TAKING_TOO_LONG", label: "Food Taking Too Long" },
  { value: "ALLERGY_SPECIAL_REQUEST", label: "Allergy / Special Request" },
  { value: "PAYMENT_ISSUE", label: "Payment Issue" },
  { value: "MANAGER_NEEDED", label: "Manager Needed" },
  { value: "SECURITY_EMERGENCY", label: "Security / Emergency" },
  { value: "OTHER", label: "Other" },
];

export function HelpRequestModal({
  restaurantId,
  tableId,
  tableLabel,
  onClose,
  onSent,
}: {
  restaurantId: string;
  tableId: string;
  tableLabel: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [reason, setReason] = useState("CUSTOMER_COMPLAINT");
  const [note, setNote] = useState("");
  const [routeToKitchen, setRouteToKitchen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/help-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, tableId, reason, note: note || undefined, routeToKitchen }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not send help request.");
      return;
    }
    onSent();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-bn-cream p-6">
        <h2 className="font-display text-lg font-semibold text-bn-charcoal">Request Help — {tableLabel}</h2>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">
            Optional Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`e.g. "Table 6 has waited 35 minutes."`}
            rows={2}
            className="mt-1 w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={routeToKitchen} onChange={(e) => setRouteToKitchen(e.target.checked)} />
          This is kitchen-related (missing/incorrect food)
        </label>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-bn-gold/40 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-full bg-bn-red py-2 text-sm font-semibold text-bn-cream disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send Help Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
