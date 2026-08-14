import { prisma } from "@/lib/prisma";
import { OrderTracker } from "@/components/customer/OrderTracker";

export const revalidate = 0;

export default async function OrderTrackingPage({
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
        <p className="mt-2 text-bn-charcoal-soft">Double-check the order number and try again.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <OrderTracker initialOrder={JSON.parse(JSON.stringify(order))} />
    </div>
  );
}
