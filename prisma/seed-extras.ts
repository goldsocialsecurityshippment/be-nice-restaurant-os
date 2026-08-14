/**
 * Optional extra seed data — stations (Kitchen/Bar), sample drinks, and the
 * Bar staff account. If you already ran the equivalent standalone scripts
 * during earlier testing, this is safe to re-run: every operation here is
 * an upsert or a duplicate-check, so nothing will be created twice.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import QRCode from "qrcode";

const prisma = new PrismaClient();
const SLUG = process.env.NEXT_PUBLIC_RESTAURANT_SLUG ?? "be-nice";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function main() {
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { slug: SLUG } });

  const kitchen = await prisma.station.upsert({
    where: { restaurantId_slug: { restaurantId: restaurant.id, slug: "kitchen" } },
    update: {},
    create: { restaurantId: restaurant.id, name: "Kitchen", slug: "kitchen", dashboardGroup: "KITCHEN", sortOrder: 0 },
  });

  const bar = await prisma.station.upsert({
    where: { restaurantId_slug: { restaurantId: restaurant.id, slug: "bar" } },
    update: {},
    create: { restaurantId: restaurant.id, name: "Bar", slug: "bar", dashboardGroup: "BAR", sortOrder: 1 },
  });

  const backfilled = await prisma.menuItem.updateMany({
    where: { restaurantId: restaurant.id, stationId: null },
    data: { stationId: kitchen.id },
  });
  console.log(`Backfilled ${backfilled.count} existing menu items to Kitchen station.`);

  type SeedCategory = {
    name: string;
    slug: string;
    items: { name: string; description?: string; price: number }[];
  };

  const drinkCategories: SeedCategory[] = [
    { name: "Water", slug: "water", items: [
      { name: "Bottled Water (Small)", price: 3 },
      { name: "Bottled Water (Large)", price: 6 },
    ]},
    { name: "Soft Drinks", slug: "soft-drinks", items: [
      { name: "Coca-Cola", price: 8 },
      { name: "Fanta", price: 8 },
      { name: "Sprite", price: 8 },
      { name: "Malta Guinness", price: 12 },
    ]},
    { name: "Juices", slug: "juices", items: [
      { name: "Fresh Orange Juice", price: 15 },
      { name: "Pineapple Juice", price: 15 },
      { name: "Mixed Fruit Juice", price: 15 },
    ]},
    { name: "Hot Drinks", slug: "hot-drinks", items: [
      { name: "Black Coffee", price: 10 },
      { name: "Milo", price: 10 },
      { name: "Ginger Tea", price: 8 },
    ]},
    { name: "Cold Drinks", slug: "cold-drinks", items: [
      { name: "Sobolo (Hibiscus Drink)", description: "Chilled hibiscus & ginger infusion.", price: 12 },
      { name: "Iced Coffee", price: 15 },
      { name: "Milkshake", price: 20 },
    ]},
  ];

  let catSort = 100;
  for (const cat of drinkCategories) {
    const category = await prisma.menuCategory.upsert({
      where: { restaurantId_slug: { restaurantId: restaurant.id, slug: cat.slug } },
      update: {},
      create: { restaurantId: restaurant.id, name: cat.name, slug: cat.slug, sortOrder: catSort },
    });
    catSort += 1;

    for (const [i, item] of cat.items.entries()) {
      const existing = await prisma.menuItem.findFirst({
        where: { restaurantId: restaurant.id, categoryId: category.id, name: item.name },
      });
      if (existing) continue;
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          stationId: bar.id,
          name: item.name,
          description: item.description,
          price: item.price,
          sortOrder: i,
          isSampleData: true,
        },
      });
    }
  }

  // Tables + QR (only if none exist yet)
  const existingTableCount = await prisma.restaurantTable.count({ where: { restaurantId: restaurant.id } });
  if (existingTableCount === 0) {
    for (let n = 1; n <= 8; n++) {
      const table = await prisma.restaurantTable.create({
        data: {
          restaurantId: restaurant.id,
          label: `Table ${n}`,
          number: n,
          capacity: n % 4 === 0 ? 8 : 4,
          seats: { create: Array.from({ length: n % 4 === 0 ? 8 : 4 }, (_, i) => ({ seatNumber: i + 1 })) },
        },
      });
      const code = crypto.randomBytes(12).toString("hex");
      const targetUrl = `${APP_URL}/order/table/${code}`;
      const imageDataUrl = await QRCode.toDataURL(targetUrl, {
        margin: 2,
        width: 480,
        color: { dark: "#241C18", light: "#FBF6ED" },
      });
      await prisma.qRCode.create({ data: { tableId: table.id, code, targetUrl, imageDataUrl } });
    }
    console.log("Seeded 8 tables (with seats) and QR codes.");
  } else {
    // Existing tables from before the seat model existed — backfill seats
    // to match each table's capacity, so nothing already-tested breaks.
    const tablesNeedingSeats = await prisma.restaurantTable.findMany({
      where: { restaurantId: restaurant.id },
      include: { seats: true },
    });
    for (const table of tablesNeedingSeats) {
      if (table.seats.length > 0) continue;
      await prisma.tableSeat.createMany({
        data: Array.from({ length: table.capacity }, (_, i) => ({ tableId: table.id, seatNumber: i + 1 })),
      });
    }
    console.log(`Backfilled seats for ${tablesNeedingSeats.filter((t) => t.seats.length === 0).length} existing table(s).`);
  }

  const barPasswordHash = await bcrypt.hash("Bar@2026", 12);
  await prisma.user.upsert({
    where: { email: "bar@benice.com" },
    update: {},
    create: { name: "Bar Team", email: "bar@benice.com", role: "BAR", passwordHash: barPasswordHash, restaurantId: restaurant.id },
  });

  console.log("Extra seed data ready: stations, sample drinks, Bar staff account (bar@benice.com / Bar@2026).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
