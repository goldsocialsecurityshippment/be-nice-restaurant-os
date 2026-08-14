import { getRestaurantOrThrow } from "@/lib/restaurant";
import { OrderManager } from "@/components/admin/OrderManager";

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const restaurant = await getRestaurantOrThrow();
  return <OrderManager restaurantId={restaurant.id} />;
}
