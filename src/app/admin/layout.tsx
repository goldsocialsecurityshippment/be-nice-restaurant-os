import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getRestaurant } from "@/lib/restaurant";
import { getSessionRole } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const restaurant = await getRestaurant();
  const role = await getSessionRole();

  return (
    <div className="flex min-h-screen bg-bn-cream-deep/30">
      <AdminSidebar restaurantId={restaurant?.id} viewerRole={role ?? ""} />
      <div className="flex-1 pt-14 md:ml-64 md:pt-0">{children}</div>
    </div>
  );
}
