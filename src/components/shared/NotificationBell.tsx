"use client";

import { useCallback, useEffect, useState } from "react";
import { useOrderEvents } from "@/lib/useOrderEvents";
import { formatDateTime } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const TYPE_ICONS: Record<string, string> = {
  NEW_ORDER: "🧾",
  HELP_REQUEST: "🚨",
  ORDER_CANCELLED: "❌",
  ORDER_READY: "✅",
  TABLE_STATUS: "🍽️",
  TABLE_OCCUPIED: "🍽️",
  TABLE_AVAILABLE: "🟢",
  SEAT_OCCUPIED: "🟢",
  SEAT_AVAILABLE: "⚪",
  REVIEW: "⭐",
};

/**
 * Drop-in notification bell for any staff dashboard (Admin, Kitchen, Bar,
 * Waitress). Shows unread count, live-updates via SSE, supports mark-read
 * and clear-all. Colors are passed in since each dashboard has a different
 * background (dark charcoal header vs light admin header).
 */
export function NotificationBell({
  restaurantId,
  variant = "dark",
}: {
  restaurantId: string;
  variant?: "dark" | "light";
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    fetch(`/api/notifications?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      });
  }, [restaurantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useOrderEvents(restaurantId, (event) => {
    if (event.type === "NOTIFICATION_CREATED") refresh();
  });

  async function markAllRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MARK_ALL_READ", restaurantId }),
    });
  }

  async function clearAll() {
    setNotifications([]);
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLEAR_ALL", restaurantId }),
    });
  }

  const iconColor = variant === "dark" ? "text-bn-cream/70 hover:text-bn-cream" : "text-bn-charcoal-soft hover:text-bn-charcoal";

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unreadCount > 0) markAllRead();
        }}
        className={`relative rounded-full p-2 ${iconColor}`}
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bn-red text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border border-bn-gold/20 bg-bn-cream text-bn-charcoal shadow-xl">
            <div className="flex items-center justify-between border-b border-bn-gold/20 px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <button onClick={clearAll} className="text-xs text-bn-red hover:underline">
                Clear all
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-bn-charcoal-soft">No notifications yet.</p>
              )}
              {notifications.map((n) => (
                <div key={n.id} className="flex gap-2 border-b border-bn-gold/10 px-4 py-3 text-sm last:border-0">
                  <span>{TYPE_ICONS[n.type] ?? "•"}</span>
                  <div>
                    <p className="text-bn-charcoal">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-bn-charcoal-soft">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
