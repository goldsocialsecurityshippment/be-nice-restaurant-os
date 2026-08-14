import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "GHS") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
    .format(value)
    .replace("GHS", "GH₵")
    .replace("GH₵GH₵", "GH₵");
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Generates a professional, date-stamped order number, e.g. BN-20260805-000125.
 * The sequence portion still increments per-restaurant via Settings.nextOrderSeq,
 * so numbers stay unique even across days.
 */
export async function generateOrderNumber(
  prisma: import("@prisma/client").PrismaClient,
  restaurantId: string
) {
  const settings = await prisma.settings.findUnique({ where: { restaurantId } });
  const prefix = settings?.orderNumberPrefix ?? "BN";
  const seq = settings?.nextOrderSeq ?? 1;

  await prisma.settings.update({
    where: { restaurantId },
    data: { nextOrderSeq: { increment: 1 } },
  });

  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  return `${prefix}-${datePart}-${String(seq).padStart(6, "0")}`;
}

export const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Order Received",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-amber-100 text-amber-800 border-amber-300",
  ACCEPTED: "bg-blue-100 text-blue-800 border-blue-300",
  PREPARING: "bg-orange-100 text-orange-800 border-orange-300",
  READY: "bg-green-100 text-green-800 border-green-300",
  SERVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  COMPLETED: "bg-neutral-200 text-neutral-700 border-neutral-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};
