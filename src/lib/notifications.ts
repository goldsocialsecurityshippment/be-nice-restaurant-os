import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";

/**
 * Creates an in-app notification (no email — this system is purely
 * real-time/in-app per the current spec) and pushes it live via SSE so
 * the recipient dashboard's notification bell updates instantly.
 */
export async function notifyAdmin(
  restaurantId: string,
  type:
    | "NEW_ORDER"
    | "ORDER_ACCEPTED"
    | "ORDER_PREPARING"
    | "ORDER_READY"
    | "ORDER_SERVED"
    | "ORDER_CANCELLED"
    | "HELP_REQUEST"
    | "REVIEW"
    | "TABLE_OCCUPIED"
    | "TABLE_AVAILABLE"
    | "TABLE_STATUS"
    | "SEAT_OCCUPIED"
    | "SEAT_AVAILABLE",
  { message, metadata }: { message: string; metadata?: Record<string, unknown> }
) {
  try {
    const notification = await prisma.notification.create({
      data: { restaurantId, type, message, metadata: metadata as never },
    });
    publishEvent({ type: "NOTIFICATION_CREATED", restaurantId, notificationId: notification.id });
    return notification;
  } catch (err) {
    console.error("Failed to create notification", err);
    return null;
  }
}
