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
          where: { restaurantId: restaurant.id, isFeatured: true, isAvailable: true },
          take: 6,
          orderBy: { sortOrder: "asc" },
        }),
        prisma.menuItem.findMany({
          where: { restaurantId: restaurant.id, category: { slug: "weekend-local-foods" }, isAvailable: true },
          take: 4,
        }),
        prisma.menuItem.findMany({
          where: {
            restaurantId: restaurant.id,
            category: { slug: { in: ["jollof-pan-packages", "chops-boxes"] } },
            isAvailable: true,
          },
          take: 6,
        }),
        prisma.review.findMany({
          where: { restaurantId: restaurant.id, isPublished: true },
          take: 6,
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], [], [], []];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-bn-charcoal text-bn-cream">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-bn-red/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-bn-gold/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-bn-gold">
              Community 5 · Tema
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] md:text-5xl">
              Authentic Ghanaian Cuisine,{" "}
              <span className="italic text-bn-gold">Made With Tradition</span>
            </h1>
            <p className="mt-5 max-w-md text-bn-cream/75">
              From weekend fufu and banku to weekday jollof, every dish at Be-Nice is prepared the way it should
              be — with care, consistency, and a little bit of pepper (or none, just say the word).
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-bn-cream/85">
              <span className="inline-flex items-center gap-2 rounded-full border border-bn-gold/40 px-3 py-1.5">
                📱 Scan the QR code on your table to place an order in seconds
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-bn-gold/40 px-3 py-1.5">
                🍲 Weekend Local Food · Fri–Sun, 11:00 AM – 6:30 PM
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/menu"
                className="rounded-full bg-bn-red px-6 py-3 text-sm font-semibold text-bn-cream shadow-lg transition hover:bg-bn-red-dark"
              >
                View Menu
              </Link>
              <Link
                href="/menu"
                className="rounded-full border border-bn-gold/50 px-6 py-3 text-sm font-semibold text-bn-cream transition hover:bg-bn-cream/5"
              >
                Order Online
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center md:justify-end">
            {restaurant?.heroImageUrl ? (
              <div className="relative h-64 w-full overflow-hidden rounded-lg sm:h-80 md:h-96">
                <Image
                  src={restaurant.heroImageUrl}
                  alt="Be-Nice signature dishes"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 500px"
                />
              </div>
            ) : (
              <div className="relative flex h-64 w-64 items-center justify-center rounded-full border border-bn-gold/30 md:h-80 md:w-80">
                <Image
                  src="/brand/be-nice-logo.png"
                  alt="Be-Nice Catering Services"
                  width={220}
                  height={220}
                  className="drop-shadow-2xl"
                  priority
                />
                <Stamp size="lg" className="absolute -bottom-4 -left-4 border-4 border-bn-charcoal">
                  Since
                  <br />
                  Day One
                </Stamp>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-4xl px-5 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-red">Our Story</p>
        <h2 className="mt-3 font-display text-3xl italic text-bn-charcoal">Be Nice. Eat Well.</h2>
        <p className="mt-5 leading-relaxed text-bn-charcoal-soft">
          Be-Nice Catering Services started with a simple idea: food made for real people, served without the
          wait, the mix-ups, or the guesswork. Today, whether you&apos;re dining in, ordering ahead, or scanning
          the code on your table, we bring the same kitchen discipline and hospitality to every order.
        </p>
        <div className="bn-divider mx-auto mt-10 w-32" />
      </section>

      {/* FEATURED MEALS */}
      {featured.length > 0 && (
        <section className="bg-bn-cream-deep/60 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-red">Fan Favourites</p>
                <h2 className="font-display text-2xl font-semibold text-bn-charcoal">Featured Meals</h2>
              </div>
              <Link href="/menu" className="text-sm font-semibold text-bn-red hover:underline">
                Full menu →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((item) => (
                <div key={item.id} className="group overflow-hidden border border-bn-gold/20 bg-bn-cream">
                  <DishImage src={item.imageUrl} alt={item.name} className="h-44 w-full" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-medium text-bn-charcoal">{item.name}</h3>
                      <span className="whitespace-nowrap font-semibold text-bn-gold">
                        {formatCurrency(item.price.toString())}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-bn-charcoal-soft line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WEEKEND SPECIALS */}
      {weekendItems.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-col items-center text-center">
            <Stamp size="md">
              Fri–Sun
              <br />
              Only
            </Stamp>
            <h2 className="mt-5 font-display text-2xl font-semibold text-bn-charcoal">Weekend Local Foods</h2>
            <p className="mt-2 max-w-lg text-sm text-bn-charcoal-soft">
              Fufu, banku, tuo zaafi and more — served Friday through Sunday, 11:00 AM to 6:30 PM.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {weekendItems.map((item) => (
              <div key={item.id} className="border border-bn-gold/20 bg-bn-cream p-4 text-center">
                <DishImage src={item.imageUrl} alt={item.name} className="mx-auto h-28 w-28 rounded-full" />
                <h3 className="mt-3 font-display font-medium text-bn-charcoal">{item.name}</h3>
                <p className="mt-1 text-sm font-semibold text-bn-gold">{formatCurrency(item.price.toString())}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CATERING PACKAGES */}
      {packages.length > 0 && (
        <section className="bg-bn-charcoal py-16 text-bn-cream">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-gold">For Groups &amp; Events</p>
              <h2 className="font-display text-2xl font-semibold">Catering Packages</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((item) => (
                <div key={item.id} className="border border-bn-cream/15 bg-bn-cream/5 p-5">
                  <h3 className="font-display text-lg font-medium">{item.name}</h3>
                  {item.description && <p className="mt-1 text-sm text-bn-cream/70">{item.description}</p>}
                  <p className="mt-3 font-semibold text-bn-gold">{formatCurrency(item.price.toString())}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bn-red">What People Say</p>
            <h2 className="font-display text-2xl font-semibold text-bn-charcoal">Customer Reviews</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <div key={review.id} className="border border-bn-gold/20 bg-bn-cream-deep/40 p-5">
                <div className="text-bn-gold">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>
                {review.comment && <p className="mt-2 text-sm text-bn-charcoal-soft">{review.comment}</p>}
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
