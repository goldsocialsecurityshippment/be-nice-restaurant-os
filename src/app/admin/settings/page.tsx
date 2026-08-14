import { getRestaurantOrThrow } from "@/lib/restaurant";
import { requireRole } from "@/lib/rbac";
import { SettingsManager } from "@/components/admin/SettingsManager";

export const revalidate = 0;

export default async function AdminSettingsPage() {
  await requireRole(["ADMIN"]);
  const restaurant = await getRestaurantOrThrow();
  return <SettingsManager restaurantId={restaurant.id} />;
}
