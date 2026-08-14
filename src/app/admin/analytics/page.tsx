import { getRestaurantOrThrow } from "@/lib/restaurant";
import { AnalyticsView } from "@/components/admin/AnalyticsView";

export const revalidate = 0;

export default async function AdminAnalyticsPage() {
  const restaurant = await getRestaurantOrThrow();
  return <AnalyticsView restaurantId={restaurant.id} />;
}
