import { getRestaurantOrThrow } from "@/lib/restaurant";
import { KitchenBoard } from "@/components/kitchen/KitchenBoard";

export const revalidate = 0;

export default async function KitchenPage() {
  const restaurant = await getRestaurantOrThrow();
  return <KitchenBoard restaurantId={restaurant.id} />;
}
