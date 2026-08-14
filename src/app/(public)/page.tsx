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
        {/* ============================================================
            DESKTOP HERO
        ============================================================ */}
        <div className="relative hidden min-h-[760px] overflow-hidden md:block">
          <Image
            src="/images/hero.jpeg"
            alt="Be-Nice Catering Services"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-black/50" />

          <div className="relative z-10 mx-auto flex min-h-[760px] max-w-6xl items-center px-5 py-20">
            <div className="max-w-2xl">
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

        {/* ============================================================
            MOBILE HERO — MATCHES MADAM'S MOCKUP
        ============================================================ */}
        <div className="relative h-[calc(100svh-76px)] min-h-[700px] overflow-hidden md:hidden">
          {/* Hero photograph */}
          <Image
            src="/images/hero-mobile.jpeg"
            alt="Be-Nice chef serving spaghetti"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "center 35%" }}
          />

          {/* Very subtle overall darkening */}
          <div className="absolute inset-0 bg-black/10" />

          {/* Bottom readability gradient */}
          <div className="absolute inset-x-0 bottom-0 h-[36%] bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

          {/* ============================================================
              MOBILE BOTTOM CONTENT
          ============================================================ */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-2">
            {/* CTA BUTTONS */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/menu"
                className="flex h-[46px] items-center justify-center rounded-full bg-bn-red px-3 text-xs font-semibold text-white shadow-lg transition active:scale-[0.98]"
              >
                View Menu
              </Link>

              <Link
                href="/menu"
                className="flex h-[46px] items-center justify-center rounded-full border border-white/70 bg-black/25 px-3 text-xs font-semibold text-white backdrop-blur-sm transition active:scale-[0.98]"
              >
                Order Online
              </Link>
            </div>

            {/* QR PILL */}
            <div className="mt-1.5 flex min-h-[44px] w-full items-center gap-2.5 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-[11px] text-white backdrop-blur-md">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3" />
                </svg>
              </span>

              <span className="leading-4">
                Scan the QR code on your table to place an order in seconds
              </span>
            </div>

            {/* WEEKEND LOCAL FOOD PILL */}
            <div className="mt-1 flex min-h-[46px] w-full items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] text-white backdrop-blur-md">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10"
                aria-hidden="true"
              >
                <span className="text-sm">🍲</span>
              </span>

              <span className="min-w-0 flex-1 leading-4">
                Weekend Local Food · Fri-Sun, 11:00 AM – 6:30 PM
              </span>

              <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-bn-red text-center text-[6px] font-bold uppercase leading-[1.1] tracking-wide text-white shadow-md">
                <span>
                  Since
                  <br />
                  Day One
                </span>
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