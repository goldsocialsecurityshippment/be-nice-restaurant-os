import { prisma } from "@/lib/prisma";

const SLUG = process.env.NEXT_PUBLIC_RESTAURANT_SLUG ?? "be-nice";

export async function getRestaurant() {
  return prisma.restaurant.findUnique({
    where: { slug: SLUG },
    include: { settings: true },
  });
}

export async function getRestaurantOrThrow() {
  const restaurant = await getRestaurant();
  if (!restaurant) throw new Error(`Restaurant with slug "${SLUG}" not found. Did you run the seed script?`);
  return restaurant;
}
