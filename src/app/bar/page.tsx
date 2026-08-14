import { getRestaurantOrThrow } from "@/lib/restaurant";
import { BarBoard } from "@/components/bar/BarBoard";

export const revalidate = 0;

export default async function BarPage() {
  const restaurant = await getRestaurantOrThrow();
  return <BarBoard restaurantId={restaurant.id} />;
}
