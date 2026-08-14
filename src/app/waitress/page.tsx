import { getRestaurantOrThrow } from "@/lib/restaurant";
import { WaitressBoard } from "@/components/waitress/WaitressBoard";

export const revalidate = 0;

export default async function WaitressPage() {
  const restaurant = await getRestaurantOrThrow();
  return <WaitressBoard restaurantId={restaurant.id} />;
}
