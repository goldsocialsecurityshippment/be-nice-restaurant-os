import { getRestaurantOrThrow } from "@/lib/restaurant";
import { prisma } from "@/lib/prisma";
import { AdminOverview } from "@/components/admin/AdminOverview";

export const revalidate = 0;

export default async function AdminOverviewPage() {
  const restaurant = await getRestaurantOrThrow();

  const recentOrders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id },
    include: { items: true, table: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <AdminOverview
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      initialRecentOrders={JSON.parse(JSON.stringify(recentOrders))}
    />
  );
}
