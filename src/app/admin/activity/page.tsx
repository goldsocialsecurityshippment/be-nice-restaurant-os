import { getRestaurantOrThrow } from "@/lib/restaurant";
import { ActivityCenter } from "@/components/admin/ActivityCenter";

export const revalidate = 0;

export default async function AdminActivityPage() {
  const restaurant = await getRestaurantOrThrow();
  return <ActivityCenter restaurantId={restaurant.id} />;
}
