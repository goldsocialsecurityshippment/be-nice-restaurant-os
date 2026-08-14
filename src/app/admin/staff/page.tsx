import { getRestaurantOrThrow } from "@/lib/restaurant";
import { getSessionRole } from "@/lib/rbac";
import { StaffManager } from "@/components/admin/StaffManager";

export const revalidate = 0;

export default async function AdminStaffPage() {
  const restaurant = await getRestaurantOrThrow();
  const role = await getSessionRole();
  return <StaffManager restaurantId={restaurant.id} viewerRole={role ?? ""} />;
}
