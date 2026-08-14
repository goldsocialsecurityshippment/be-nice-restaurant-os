"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";

type Review = {
  id: string;
  customerName: string;
  rating: number;
  foodRating: number | null;
  serviceRating: number | null;
  waitTimeRating: number | null;
  friendlinessRating: number | null;
  comment: string | null;
  photoUrl: string | null;
  adminReply: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
};

function Stars({ value }: { value: number }) {
  return (
    <span className="text-bn-gold">
      {"★".repeat(value)}
      {"☆".repeat(5 - value)}
    </span>
  );
}

export function ReviewsManager({ restaurantId }: { restaurantId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"all" | "published" | "hidden" | "featured">("all");
  const [search, setSearch] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  function refresh() {
    const qs = new URLSearchParams({ restaurantId, all: "true" });
    if (search) qs.set("search", search);
    fetch(`/api/reviews?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews ?? []));
  }

  useEffect(refresh, [restaurantId, search]);

  async function toggleVisibility(review: Review) {
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, isPublished: !r.isPublished } : r)));
    await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !review.isPublished }),
    });
  }

  async function toggleFeatured(review: Review) {
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, isFeatured: !r.isFeatured } : r)));
    await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !review.isFeatured }),
    });
  }

  async function sendReply(review: Review) {
    const reply = replyDrafts[review.id];
    if (!reply?.trim()) return;
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, adminReply: reply } : r)));
    await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminReply: reply }),
    });
  }

  const filtered = reviews.filter((r) => {
    if (filter === "published") return r.isPublished;
    if (filter === "hidden") return !r.isPublished;
    if (filter === "featured") return r.isFeatured;
    return true;
  });

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-semibold text-bn-charcoal">Reviews</h1>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Average Rating</p>
          <p className="mt-2 font-display text-2xl font-semibold text-bn-red">{avgRating} / 5</p>
        </div>
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Total Reviews</p>
          <p className="mt-2 font-display text-2xl font-semibold text-bn-gold">{reviews.length}</p>
        </div>
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Rating Distribution</p>
          <div className="mt-2 space-y-1">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-6">{d.star}★</span>
                <div className="h-2 flex-1 rounded-full bg-bn-gold/10">
                  <div
                    className="h-2 rounded-full bg-bn-gold"
                    style={{ width: reviews.length ? `${(d.count / reviews.length) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-5 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["all", "published", "hidden", "featured"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize ${
              filter === f ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30 text-bn-charcoal-soft"
            }`}
          >
            {f}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reviews…"
          className="ml-auto w-full max-w-xs rounded border border-bn-gold/30 bg-bn-cream px-3 py-1.5 text-sm"
        />
      </div>

      <div className="mt-5 space-y-3">
        {filtered.map((review) => (
          <div key={review.id} className="border border-bn-gold/20 bg-bn-cream p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Stars value={review.rating} />
                <p className="mt-1 text-sm font-semibold text-bn-charcoal">{review.customerName}</p>
                <p className="text-xs text-bn-charcoal-soft">{formatDateTime(review.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFeatured(review)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    review.isFeatured ? "bg-bn-gold/30 text-bn-charcoal" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {review.isFeatured ? "★ Featured" : "Feature"}
                </button>
                <button
                  onClick={() => toggleVisibility(review)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    review.isPublished ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {review.isPublished ? "Published" : "Hidden"}
                </button>
              </div>
            </div>

            {(review.foodRating || review.serviceRating || review.waitTimeRating || review.friendlinessRating) && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-bn-charcoal-soft">
                {review.foodRating && <span>Food: {review.foodRating}★</span>}
                {review.serviceRating && <span>Service: {review.serviceRating}★</span>}
                {review.waitTimeRating && <span>Wait: {review.waitTimeRating}★</span>}
                {review.friendlinessRating && <span>Friendliness: {review.friendlinessRating}★</span>}
              </div>
            )}

            {review.comment && <p className="mt-2 text-sm text-bn-charcoal-soft">{review.comment}</p>}
            {review.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={review.photoUrl} alt="Review attachment" className="mt-2 h-24 w-24 rounded object-cover" />
            )}

            {review.adminReply ? (
              <div className="mt-3 rounded bg-bn-gold/10 px-3 py-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">Owner reply</p>
                <p className="mt-1 text-bn-charcoal">{review.adminReply}</p>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <input
                  value={replyDrafts[review.id] ?? ""}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                  placeholder="Reply to this review…"
                  className="flex-1 rounded border border-bn-gold/30 bg-transparent px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => sendReply(review)}
                  className="rounded-full bg-bn-charcoal px-3 py-1.5 text-xs font-semibold text-bn-cream hover:bg-bn-red"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-bn-charcoal-soft">No reviews match this filter.</p>
        )}
      </div>
    </div>
  );
}
