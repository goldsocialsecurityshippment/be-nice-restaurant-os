import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getRestaurant } from "@/lib/restaurant";
import { Stamp } from "@/components/shared/Stamp";
import { DishImage } from "@/components/shared/DishImage";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 0;

export default async function HomePage() {
  const restaurant = await getRestaurant();

  const [featured, weekendItems, packages, reviews] = restaurant
    ? await Promise.all([
        prisma.menuItem.findMany({
          where: {
            restaurantId: restaurant.id,
            isFeatured: true,
            isAvailable: true,
          },
          take: 6,
          orderBy: { sortOrder: "asc" },
        }),

        prisma.menuItem.findMany({
          where: {
            restaurantId: restaurant.id,
            category: {
              slug: "weekend-local-foods",
            },
            isAvailable: true,
          },
          take: 4,
        }),

        prisma.menuItem.findMany({
          where: {
            restaurantId: restaurant.id,
            category: {
              slug: {
                in: ["jollof-pan-packages", "chops-boxes"],
              },
            },
            isAvailable: true,
          },
          take: 6,
        }),

        prisma.review.findMany({
          where: {
            restaurantId: restaurant.id,
            isPublished: true,
          },
          take: 6,
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], [], [], []];

  return (
    <>
      {/* ============================================================
          HERO
      ============================================================ */}
      <section className="relative overflow-hidden bg-bn-charcoal text-bn-cream">

        {/* ================= DESKTOP HERO ================= */}
        <div className="relative hidden min-h-[760px] overflow-hidden md:block">

          <Image
            src="/images/hero.jpeg"
            alt="Be-Nice Catering Services"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />

          <div className="absolute inset-0 bg-black/50" />

          <div className="relative z-10 mx-auto flex min-h-[760px] max-w-6xl items-center px-5 py-20">
            <div className="max-w-2xl">

              {/* Desktop Logo */}
              <div className="mb-8">
                <Image
                  src="/images/logo.jpeg"
                  alt="Be-Nice Catering Services logo"
                  width={110}
                  height={110}
                  className="h-auto w-[90px] rounded-full object-contain"
                />
              </div>

              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-bn-gold">
                Community 5 · Tema
              </p>

              <h1 className="font-display text-6xl font-semibold leading-[1.05] lg:text-7xl">
                Authentic Ghanaian Cuisine,{" "}
                <span className="italic text-bn-gold">
                  Made With Tradition
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-7 text-bn-cream/90">
                From weekend fufu and banku to weekday jollof, every dish at
                Be-Nice is prepared the way it should be — with care,
                consistency, and a little bit of pepper (or none, just say
                the word).
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-bn-cream">

                <span className="rounded-full border border-bn-gold/50 bg-black/20 px-4 py-2 backdrop-blur-sm">
                  📱 Scan the QR code on your table
                </span>

                <span className="rounded-full border border-bn-gold/50 bg-black/20 px-4 py-2 backdrop-blur-sm">
                  🍲 Weekend Local Food · Fri–Sun
                </span>

              </div>

              <div className="mt-8 flex flex-wrap gap-4">

                <Link
                  href="/menu"
                  className="rounded-full bg-bn-red px-7 py-3.5 text-sm font-semibold text-bn-cream shadow-lg transition hover:bg-bn-red-dark"
                >
                  View Menu
                </Link>

                <Link
                  href="/menu"
                  className="rounded-full border border-bn-gold/60 bg-black/20 px-7 py-3.5 text-sm font-semibold text-bn-cream backdrop-blur-sm transition hover:bg-bn-cream/10"
                >
                  Order Online
                </Link>

              </div>

            </div>
          </div>
        </div>

        {/* ================= MOBILE HERO ================= */}
        <div className="relative min-h-[720px] overflow-hidden md:hidden">

          <Image
            src="/images/hero.jpeg"
            alt="Be-Nice Catering Services"
            fill
            priority
            className="object-cover object-[68%_center]"
            sizes="100vw"
          />

          <div className="absolute inset-0 bg-black/35" />

          <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

          <div className="relative z-10 flex min-h-[720px] flex-col justify-end px-5 pb-8">

            {/* Mobile Logo */}
            <div className="mb-5">
              <Image
                src="/images/logo.jpeg"
                alt="Be-Nice Catering Services logo"
                width={90}
                height={90}
                className="h-auto w-[72px] rounded-full object-contain"
              />
            </div>

            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-bn-gold">
              Community 5 · Tema
            </p>

            <h1 className="max-w-[330px] font-display text-4xl font-semibold leading-[1.02]">
              Authentic Ghanaian Cuisine,{" "}
              <span className="italic text-bn-gold">
                Made With Tradition
              </span>
            </h1>

            <p className="mt-4 max-w-[340px] text-sm leading-6 text-bn-cream/90">
              From weekend fufu and banku to weekday jollof, every dish at
              Be-Nice is prepared with care, consistency, and a little bit of
              pepper.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <Link
                href="/menu"
                className="flex items-center justify-center rounded-full bg-bn-red px-4 py-3.5 text-sm font-semibold text-bn-cream shadow-lg"
              >
                View Menu
              </Link>

              <Link
                href="/menu"
                className="flex items-center justify-center rounded-full border border-bn-gold/70 bg-black/30 px-4 py-3.5 text-sm font-semibold text-bn-cream backdrop-blur-sm"
              >
                Order Online
              </Link>

            </div>

            <div className="mt-4 flex flex-col gap-2 text-[11px] text-bn-cream">

              <span className="w-fit rounded-full border border-bn-gold/50 bg-black/35 px-3.5 py-2 backdrop-blur-sm">
                📱 Scan the QR code on your table
              </span>

              <span className="w-fit rounded-full border border-bn-gold/50 bg-black/35 px-3.5 py-2 backdrop-blur-sm">
                🍲 Weekend Local Food · Fri–Sun
              </span>

            </div>

          </div>
        </div>

      </section>

      {/* ============================================================
          FEATURED ITEMS
      ============================================================ */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">

          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-red">
              Our Favorites
            </p>

            <h2 className="mt-2 font-display text-2xl font-semibold text-bn-charcoal">
              Featured Dishes
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <div
                key={item.id}
                className="border border-bn-gold/20 bg-bn-cream p-5"
              >
                <DishImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-56 w-full"
                />

                <h3 className="mt-4 font-display text-lg font-medium text-bn-charcoal">
                  {item.name}
                </h3>

                {item.description && (
                  <p className="mt-1 text-sm text-bn-charcoal-soft">
                    {item.description}
                  </p>
                )}

                <p className="mt-3 font-semibold text-bn-gold">
                  {formatCurrency(item.price.toString())}
                </p>
              </div>
            ))}
          </div>

        </section>
      )}

      {/* ============================================================
          WEEKEND SPECIALS
      ============================================================ */}
      {weekendItems.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">

          <div className="flex flex-col items-center text-center">

            <Stamp size="md">
              Fri–Sun
              <br />
              Only
            </Stamp>

            <h2 className="mt-5 font-display text-2xl font-semibold text-bn-charcoal">
              Weekend Local Foods
            </h2>

            <p className="mt-2 max-w-lg text-sm text-bn-charcoal-soft">
              Fufu, banku, tuo zaafi and more — served Friday through Sunday,
              11:00 AM to 6:30 PM.
            </p>

          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

            {weekendItems.map((item) => (
              <div
                key={item.id}
                className="border border-bn-gold/20 bg-bn-cream p-4 text-center"
              >

                <DishImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="mx-auto h-28 w-28 rounded-full"
                />

                <h3 className="mt-3 font-display font-medium text-bn-charcoal">
                  {item.name}
                </h3>

                <p className="mt-1 text-sm font-semibold text-bn-gold">
                  {formatCurrency(item.price.toString())}
                </p>

              </div>
            ))}

          </div>

        </section>
      )}

      {/* ============================================================
          CATERING PACKAGES
      ============================================================ */}
      {packages.length > 0 && (
        <section className="bg-bn-charcoal py-16 text-bn-cream">

          <div className="mx-auto max-w-6xl px-5">

            <div className="mb-8 text-center">

              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-gold">
                For Groups &amp; Events
              </p>

              <h2 className="font-display text-2xl font-semibold">
                Catering Packages
              </h2>

            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {packages.map((item) => (
                <div
                  key={item.id}
                  className="border border-bn-cream/15 bg-bn-cream/5 p-5"
                >

                  <h3 className="font-display text-lg font-medium">
                    {item.name}
                  </h3>

                  {item.description && (
                    <p className="mt-1 text-sm text-bn-cream/70">
                      {item.description}
                    </p>
                  )}

                  <p className="mt-3 font-semibold text-bn-gold">
                    {formatCurrency(item.price.toString())}
                  </p>

                </div>
              ))}

            </div>

          </div>

        </section>
      )}

      {/* ============================================================
          REVIEWS
      ============================================================ */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">

          <div className="mb-8 text-center">

            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-red">
              What People Say
            </p>

            <h2 className="font-display text-2xl font-semibold text-bn-charcoal">
              Customer Reviews
            </h2>

          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-bn-gold/20 bg-bn-cream-deep/40 p-5"
              >

                <div className="text-bn-gold">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>

                {review.comment && (
                  <p className="mt-2 text-sm text-bn-charcoal-soft">
                    {review.comment}
                  </p>
                )}

                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-bn-charcoal">
                  {review.customerName}
                </p>

              </div>
            ))}

          </div>

        </section>
      )}

    </>
  );
}
