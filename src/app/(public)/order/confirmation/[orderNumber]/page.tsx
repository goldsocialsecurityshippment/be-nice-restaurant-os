import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 0;

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, table: true, restaurant: { include: { settings: true } } },
  });

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="font-display text-2xl text-bn-charcoal">Order not found</h1>
      </div>
    );
  }

  const settings = order.restaurant.settings;

  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <div className="border-2 border-dashed border-bn-gold/50 bg-bn-cream p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-red">Order Confirmed</p>
        <p className="mt-3 text-sm text-bn-charcoal-soft">Your ticket number</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-wide text-bn-charcoal">{order.orderNumber}</p>

        {order.table && (
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-bn-gold">{order.table.label}</p>
        )}
        {!order.table && (
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-bn-gold">Pickup Order</p>
        )}

        <div className="mt-5 rounded bg-bn-gold/10 px-4 py-3 text-sm text-bn-charcoal">
          📸 Please save or screenshot this ticket number — you&apos;ll need it to track your order.
        </div>

        {settings && (
          <p className="mt-4 text-sm text-bn-charcoal-soft">
            Estimated waiting time: <strong>{settings.estimatedPrepMinLow}–{settings.estimatedPrepMinHigh} minutes</strong>
          </p>
        )}

        <div className="mt-5 space-y-2 border-t border-bn-gold/20 pt-4 text-left">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.nameSnapshot} × {item.quantity}</span>
              <span className="font-semibold text-bn-gold">{formatCurrency(item.lineTotal.toString())}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-bn-gold/20 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(order.total.toString())}</span>
          </div>
        </div>

        <Link
          href={`/order/track/${order.orderNumber}`}
          className="mt-6 block w-full rounded-full bg-bn-red py-3 text-sm font-semibold text-bn-cream transition hover:bg-bn-red-dark"
        >
          Track Order
        </Link>
        <Link href="/menu" className="mt-3 block text-xs text-bn-charcoal-soft hover:underline">
          Back to menu
        </Link>
      </div>
    </div>
  );
}
