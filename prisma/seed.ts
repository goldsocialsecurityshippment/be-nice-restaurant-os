import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import QRCode from "qrcode";

const prisma = new PrismaClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SLUG = process.env.NEXT_PUBLIC_RESTAURANT_SLUG ?? "be-nice";

async function main() {
  console.log("Seeding Be-Nice Catering Services…");

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: SLUG },
    update: {},
    create: {
      name: "Be-Nice Catering Services",
      slug: SLUG,
      logoUrl: "/brand/be-nice-logo.png",
      address: "Adjacent Aggrey Road Sch. Park, Near Prince Of Peace Presby Church, Africa Unity Road, Community 5, Tema",
      phone1: "055 171 3612",
      phone2: "020 646 9217",
      phone3: "030 322 4933",
      instagram: "@benicecateringservices",
      description:
        "Authentic Ghanaian cuisine made with tradition — Be-Nice Catering Services serves weekend local foods, weekday lunch specials, and full catering packages in Community 5, Tema.",
      colorPrimary: "#C1272D",
      colorAccent: "#B8935A",
      colorBg: "#FBF6ED",
      colorText: "#241C18",
      settings: {
        create: {
          estimatedPrepMinLow: 20,
          estimatedPrepMinHigh: 30,
          weekendMenuDays: "FRI,SAT,SUN",
          weekendMenuStart: "11:00",
          weekendMenuEnd: "18:30",
          currency: "GHS",
          orderNumberPrefix: "BN",
          nextOrderSeq: 100,
          acceptingOrders: true,
        },
      },
    },
  });

  // ---------------- Staff accounts ----------------
  const staffAccounts = [
    { name: "Be-Nice Admin", email: "admin@benice.com", role: "ADMIN" as const, password: "Admin@2026" },
    { name: "Kitchen Team", email: "kitchen@benice.com", role: "KITCHEN" as const, password: "Kitchen@2026" },
    { name: "Front of House", email: "waitress@benice.com", role: "WAITRESS" as const, password: "Waitress@2026" },
    { name: "Bar Team", email: "bar@benice.com", role: "BAR" as const, password: "Bar@2026" },
    // Named individual accounts, per the "no shared staff accounts" policy —
    // each real employee should get their own login like these.
    { name: "Grace Owusu", email: "waitress.grace@benice.com", role: "WAITRESS" as const, password: "Grace@2026" },
    { name: "Abena Mensah", email: "waitress.abena@benice.com", role: "WAITRESS" as const, password: "Abena@2026" },
    { name: "John Boateng", email: "bar.john@benice.com", role: "BAR" as const, password: "John@2026" },
    { name: "David Asare", email: "kitchen.david@benice.com", role: "KITCHEN" as const, password: "David@2026" },
    { name: "Operations Manager", email: "manager@benice.com", role: "MANAGER" as const, password: "Manager@2026" },
  ];

  for (const acc of staffAccounts) {
    const passwordHash = await bcrypt.hash(acc.password, 12);
    await prisma.user.upsert({
  where: { email: acc.email },
  update: {
    name: acc.name,
    role: acc.role,
    passwordHash,
    restaurantId: restaurant.id,
  },
  create: {
    name: acc.name,
    email: acc.email,
    role: acc.role,
    passwordHash,
    restaurantId: restaurant.id,
  },
});
  }

  // ---------------- Menu categories ----------------
  type SeedCategory = {
    name: string;
    slug: string;
    isWeekendOnly?: boolean;
    availableDays?: string;
    availableFrom?: string;
    availableTo?: string;
    items: { name: string; description?: string; price: number; isFeatured?: boolean }[];
  };

  const categories: SeedCategory[] = [
    {
      name: "Weekend Local Foods",
      slug: "weekend-local-foods",
      isWeekendOnly: true,
      availableDays: "FRI,SAT,SUN",
      availableFrom: "11:00",
      availableTo: "18:30",
      items: [
        { name: "Fufu", description: "Pounded cassava & plantain with your choice of soup.", price: 35, isFeatured: true },
        { name: "Banku", description: "Fermented corn & cassava dough, served with soup or okro.", price: 30 },
        { name: "Tuo Zaafi", description: "Northern-style soft dough served with ayoyo or okro soup.", price: 32 },
        { name: "Konkonte", description: "Cassava dough classic, served with light soup.", price: 30 },
        { name: "Omotuo", description: "Rice balls served with groundnut or palm nut soup.", price: 30 },
      ],
    },
    {
      name: "Proteins",
      slug: "proteins",
      items: [
        { name: "Chicken", price: 20 },
        { name: "Goat Meat", price: 25 },
        { name: "Tilapia", price: 30, isFeatured: true },
        { name: "Salmon", price: 35 },
        { name: "Tuna", price: 28 },
        { name: "Beef", price: 22 },
      ],
    },
    {
      name: "Soups",
      slug: "soups",
      items: [
        { name: "Palm Nut Soup", price: 25 },
        { name: "Groundnut Soup", price: 25 },
        { name: "Light Soup", price: 22 },
        { name: "Okro Soup", price: 22 },
      ],
    },
    {
      name: "Weekly Lunch Menu",
      slug: "weekly-lunch-menu",
      availableDays: "TUE,WED,THU,FRI",
      items: [
        { name: "Jollof & Chicken", description: "Our signature smoky jollof rice with grilled chicken.", price: 30, isFeatured: true },
        { name: "Fried Rice", description: "Fried rice with mixed vegetables and your choice of protein.", price: 35 },
        { name: "Banku & Okro", price: 32 },
      ],
    },
    {
      name: "Jollof Pan Packages",
      slug: "jollof-pan-packages",
      items: [
        { name: "Small Jollof Pan", description: "Serves 5–8 people.", price: 180 },
        { name: "Medium Jollof Pan", description: "Serves 10–15 people.", price: 320 },
        { name: "Large Jollof Pan", description: "Serves 20–25 people.", price: 550 },
      ],
    },
    {
      name: "Chops Boxes",
      slug: "chops-boxes",
      items: [
        { name: "Classic Chops Box", description: "A crowd-pleasing mix of finger foods.", price: 15 },
        { name: "Yummy Chops Box", description: "Our most popular chops selection.", price: 20, isFeatured: true },
        { name: "Deluxe Chops Box", description: "Premium selection for special occasions.", price: 28 },
      ],
    },
  ];

  for (const [catIndex, cat] of categories.entries()) {
    const category = await prisma.menuCategory.upsert({
      where: { restaurantId_slug: { restaurantId: restaurant.id, slug: cat.slug } },
      update: {},
      create: {
        restaurantId: restaurant.id,
        name: cat.name,
        slug: cat.slug,
        sortOrder: catIndex,
        isWeekendOnly: cat.isWeekendOnly ?? false,
        availableDays: cat.availableDays,
        availableFrom: cat.availableFrom,
        availableTo: cat.availableTo,
      },
    });

    for (const [itemIndex, item] of cat.items.entries()) {
      const existing = await prisma.menuItem.findFirst({
        where: { restaurantId: restaurant.id, categoryId: category.id, name: item.name },
      });
      if (existing) continue;
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          price: item.price,
          isFeatured: item.isFeatured ?? false,
          sortOrder: itemIndex,
        },
      });
    }
  }

  // ---------------- Tables + QR codes ----------------
  for (let n = 1; n <= 8; n++) {
    const existingTable = await prisma.restaurantTable.findUnique({
      where: { restaurantId_number: { restaurantId: restaurant.id, number: n } },
    });
    if (existingTable) continue;

    const table = await prisma.restaurantTable.create({
      data: { restaurantId: restaurant.id, label: `Table ${n}`, number: n, capacity: n % 4 === 0 ? 8 : 4 },
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

  // ---------------- Sample reviews ----------------
  const reviewCount = await prisma.review.count({ where: { restaurantId: restaurant.id } });
  if (reviewCount === 0) {
    await prisma.review.createMany({
      data: [
        {
          restaurantId: restaurant.id,
          customerName: "Ama K.",
          rating: 5,
          comment: "The fufu and light soup was exactly like home cooking. Fast service too!",
        },
        {
          restaurantId: restaurant.id,
          customerName: "Kwame T.",
          rating: 5,
          comment: "Scanned the QR code at my table, ordered in under a minute. Loved it.",
        },
        {
          restaurantId: restaurant.id,
          customerName: "Efua B.",
          rating: 4,
          comment: "Great jollof pan for our office event — will be ordering again.",
        },
      ],
    });
  }

  console.log("Seed complete.");
  console.log("Staff logins:");
  for (const acc of staffAccounts) {
    console.log(`  ${acc.role}: ${acc.email} / ${acc.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
