import { getRestaurant } from "@/lib/restaurant";
import { MenuBrowser } from "@/components/customer/MenuBrowser";

export const revalidate = 0;

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const restaurant = await getRestaurant();
  const { table } = await searchParams;

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl">Menu unavailable</h1>
        <p className="mt-2 text-bn-charcoal-soft">
          The restaurant hasn&apos;t been set up yet. Run the database seed script to load the Be-Nice menu.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-red">Our Menu</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-bn-charcoal">
          Browse &amp; Order Online
        </h1>
        <p className="mt-2 text-sm text-bn-charcoal-soft">
          Add items to your order, then choose pickup or table service at checkout.
        </p>
      </div>
      <MenuBrowser restaurantId={restaurant.id} tableCode={table} />
    </div>
  );
}
