import { getRestaurantOrThrow } from "@/lib/restaurant";
import { ReportsView } from "@/components/admin/ReportsView";

export const revalidate = 0;

export default async function AdminReportsPage() {
  const restaurant = await getRestaurantOrThrow();
  return <ReportsView restaurantId={restaurant.id} />;
}
