import { getRestaurantOrThrow } from "@/lib/restaurant";
import { TableManager } from "@/components/admin/TableManager";

export const revalidate = 0;

export default async function AdminTablesPage() {
  const restaurant = await getRestaurantOrThrow();
  return <TableManager restaurantId={restaurant.id} />;
}
