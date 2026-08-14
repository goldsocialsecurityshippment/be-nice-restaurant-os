import { getRestaurantOrThrow } from "@/lib/restaurant";
import { CashierBoard } from "@/components/cashier/CashierBoard";

export const revalidate = 0;

export default async function CashierPage() {
  const restaurant = await getRestaurantOrThrow();
  return <CashierBoard restaurantId={restaurant.id} />;
}
