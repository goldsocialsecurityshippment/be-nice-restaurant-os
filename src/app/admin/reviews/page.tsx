import { getRestaurantOrThrow } from "@/lib/restaurant";
import { ReviewsManager } from "@/components/admin/ReviewsManager";

export const revalidate = 0;

export default async function AdminReviewsPage() {
  const restaurant = await getRestaurantOrThrow();
  return <ReviewsManager restaurantId={restaurant.id} />;
}
