import { PrismaClient } from "@prisma/client";
import { publishEvent } from "@/lib/events";

/**
 * Recomputes an order's overall status from the status of its individual
 * items (each item belongs to its own station — Kitchen, Bar, or any future
 * station — and progresses independently). Called after any per-item
 * status update, and after cancellation.
 */
export async function recomputeOrderStatus(prisma: PrismaClient, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return null;
  if (order.status === "CANCELLED") return order;

  const statuses = order.items.map((i) => i.status);
  const allServed = statuses.every((s) => s === "SERVED");
  const allReadyOrServed = statuses.every((s) => s === "READY" || s === "SERVED");
  const anyStarted = statuses.some((s) => s === "PREPARING" || s === "READY" || s === "SERVED");

  let nextStatus = order.status;
  if (allServed) nextStatus = "SERVED";
  else if (allReadyOrServed) nextStatus = "READY";
  else if (anyStarted && order.status !== "READY") nextStatus = "PREPARING";

  if (nextStatus === order.status) return order;

  const data: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "PREPARING" && !order.preparingAt) data.preparingAt = new Date();
  if (nextStatus === "READY" && !order.readyAt) data.readyAt = new Date();
  if (nextStatus === "SERVED" && !order.servedAt) data.servedAt = new Date();

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...data,
      statusHistory: { create: { status: nextStatus as never } },
    },
    include: { items: true, table: true },
  });

  publishEvent({ type: "ORDER_UPDATED", restaurantId: updated.restaurantId, orderId: updated.id, status: updated.status });

  return updated;
}
