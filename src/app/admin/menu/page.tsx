import { getRestaurantOrThrow } from "@/lib/restaurant";
import { requireRole } from "@/lib/rbac";
import { MenuManager } from "@/components/admin/MenuManager";

export const revalidate = 0;

export default async function AdminMenuPage() {
  await requireRole(["ADMIN"]);
  const restaurant = await getRestaurantOrThrow();
  return <MenuManager restaurantId={restaurant.id} />;
}
