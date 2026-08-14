"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrderEvents } from "@/lib/useOrderEvents";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";

type OrderItem = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  lineTotal: string;
  notes: string | null;
  status: string;
  stationSnapshot: string | null;
  dashboardGroupSnapshot: string | null;
};
type Order = {
  id: string;
  orderNumber: string;
  restaurantId: string;
  status: string;
  total: string;
  cancelReason: string | null;
  table: { label: string } | null;
  items: OrderItem[];
  restaurant: { settings: { estimatedPrepMinLow: number; estimatedPrepMinHigh: number } | null };
};

const STEPS = ["RECEIVED", "ACCEPTED", "PREPARING", "READY", "SERVED"];

const ITEM_STATUS_LABELS: Record<string, string> = {
  PENDING: "Waiting",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
};

function summarizeGroupStatus(items: OrderItem[]): string {
  if (items.every((i) => i.status === "SERVED")) return "SERVED";
  if (items.every((i) => i.status === "READY" || i.status === "SERVED")) return "READY";
  if (items.some((i) => i.status === "PREPARING" || i.status === "READY" || i.status === "SERVED")) return "PREPARING";
  return "PENDING";
}

export function OrderTracker({ initialOrder }: { initialOrder: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const router = useRouter();

  useOrderEvents(order.restaurantId, (event) => {
    if (event.type === "ORDER_UPDATED" && event.orderId === order.id) {
      fetch(`/api/orders/${order.id}`)
        .then((r) => r.json())
        .then((data) => data.order && setOrder(data.order));
    }
  });

  const stepIndex = STEPS.indexOf(order.status);
  const isDone = order.status === "SERVED" || order.status === "COMPLETED";
  const isCancelled = order.status === "CANCELLED";
  const canCancel = order.status === "RECEIVED";

  async function cancelOrder() {
    if (!confirm("Cancel this order? This can't be undone.")) return;
    setCancelling(true);
    setCancelError(null);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED", cancelReason: "Cancelled by customer" }),
    });
    setCancelling(false);
    if (!res.ok) {
      const data = await res.json();
      setCancelError(data.error ?? "Could not cancel this order.");
      return;
    }
    router.refresh();
    const data = await res.json();
    if (data.order) setOrder(data.order);
  }

  const groups = new Map<string, OrderItem[]>();
  for (const item of order.items) {
    const key = item.stationSnapshot ?? "Kitchen";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const groupSummaries = [...groups.entries()].map(([station, items]) => ({
    station,
    status: summarizeGroupStatus(items),
  }));

  return (
    <div>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-red">Order {order.orderNumber}</p>
        {order.table && <p className="mt-1 text-sm text-bn-charcoal-soft">{order.table.label}</p>}
        <div className="mt-4 flex justify-center">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {isCancelled && (
        <div className="mt-6 rounded bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          This order was cancelled{order.cancelReason ? `: ${order.cancelReason}` : "."}
        </div>
      )}

      {!isCancelled && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step} className="flex flex-1 flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${i <= stepIndex ? "bg-bn-red" : "bg-bn-gold/20"}`} />
                {i < STEPS.length - 1 && (
                  <div className={`mt-1.5 h-0.5 w-full ${i < stepIndex ? "bg-bn-red" : "bg-bn-gold/20"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-bn-charcoal-soft">
            <span>Received</span>
            <span>Accepted</span>
            <span>Preparing</span>
            <span>Ready</span>
            <span>Served</span>
          </div>
        </div>
      )}

      {!isCancelled && groupSummaries.length > 1 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {groupSummaries.map((g) => (
            <span
              key={g.station}
              className="rounded-full border border-bn-gold/30 bg-bn-cream-deep/50 px-3 py-1 text-xs text-bn-charcoal"
            >
              {g.station}: {ITEM_STATUS_LABELS[g.status] ?? g.status}
            </span>
          ))}
        </div>
      )}

      {!isDone && !isCancelled && order.restaurant.settings && (
        <p className="mt-8 text-center text-sm text-bn-charcoal-soft">
          Estimated waiting time: {order.restaurant.settings.estimatedPrepMinLow}–
          {order.restaurant.settings.estimatedPrepMinHigh} minutes
        </p>
      )}

      {canCancel && (
        <div className="mt-6 text-center">
          <p className="text-xs text-bn-charcoal-soft">
            Orders can only be cancelled before they have been accepted.
          </p>
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="mt-2 rounded-full border border-red-400 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel Order"}
          </button>
          {cancelError && <p className="mt-2 text-xs text-red-600">{cancelError}</p>}
        </div>
      )}

      <div className="mt-10 border border-bn-gold/20 bg-bn-cream-deep/40 p-5">
        <h2 className="font-display font-semibold text-bn-charcoal">Order Summary</h2>
        <div className="mt-3 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.nameSnapshot} × {item.quantity}
                {item.notes && <span className="text-bn-charcoal-soft"> — {item.notes}</span>}
              </span>
              <span className="font-semibold text-bn-gold">{formatCurrency(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-bn-gold/20 pt-3 font-semibold">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>

      {isDone && (
        <div className="mt-4 text-center">
          <a
            href={`/api/orders/${order.id}/receipt`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-bn-red hover:underline"
          >
            Download Receipt (PDF)
          </a>
        </div>
      )}

      {isDone && !reviewSubmitted && (
        <ReviewForm
          restaurantId={order.restaurantId}
          orderId={order.id}
          onSubmitted={() => setReviewSubmitted(true)}
        />
      )}
      {reviewSubmitted && (
        <p className="mt-6 text-center text-sm text-bn-charcoal-soft">Thanks for your feedback! 🙏</p>
      )}
    </div>
  );
}

function StarPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-bn-charcoal-soft">{label}</span>
      <div className="flex gap-0.5 text-lg text-bn-gold">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}>
            {n <= value ? "★" : "☆"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({
  restaurantId,
  orderId,
  onSubmitted,
}: {
  restaurantId: string;
  orderId: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [waitTimeRating, setWaitTimeRating] = useState(5);
  const [friendlinessRating, setFriendlinessRating] = useState(5);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhoto(file: File) {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("context", "review");
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await res.json();
    setUploading(false);
    if (res.ok) setPhotoUrl(data.url);
  }

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        orderId,
        customerName: name,
        rating,
        foodRating,
        serviceRating,
        waitTimeRating,
        friendlinessRating,
        comment: comment || undefined,
        photoUrl: photoUrl || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not submit review.");
      return;
    }
    onSubmitted();
  }

  return (
    <div className="mt-8 border-t border-bn-gold/20 pt-8">
      <h2 className="text-center font-display font-semibold text-bn-charcoal">How was your meal?</h2>

      <div className="mt-4 flex justify-center gap-1 text-2xl text-bn-gold">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            {n <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2 rounded border border-bn-gold/20 bg-bn-cream-deep/30 p-4">
        <StarPicker label="Food quality" value={foodRating} onChange={setFoodRating} />
        <StarPicker label="Service" value={serviceRating} onChange={setServiceRating} />
        <StarPicker label="Waiting time" value={waitTimeRating} onChange={setWaitTimeRating} />
        <StarPicker label="Staff friendliness" value={friendlinessRating} onChange={setFriendlinessRating} />
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="mt-4 w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm outline-none"
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us more (optional)"
        rows={2}
        className="mt-2 w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm outline-none"
      />

      <div className="mt-2">
        <label className="text-xs text-bn-charcoal-soft">Add a photo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
          className="mt-1 w-full text-xs"
        />
        {uploading && <p className="mt-1 text-xs text-bn-gold">Uploading…</p>}
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Your upload" className="mt-2 h-20 w-20 rounded object-cover" />
        )}
      </div>

      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting || !name.trim()}
        className="mt-4 w-full rounded-full bg-bn-red py-2.5 text-sm font-semibold text-bn-cream disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Submit Review"}
      </button>
    </div>
  );
}
