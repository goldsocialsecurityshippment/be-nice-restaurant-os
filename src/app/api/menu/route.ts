import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { auth } from "@/lib/auth";

// GET /api/menu?restaurantId=xxx -> categories with nested items, for the public menu page
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ categories });
}

const menuItemSchema = z.object({
  restaurantId: z.string(),
  categoryId: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  price: z.number().positive(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  stockQty: z.number().int().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// POST /api/menu -> create a menu item (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.menuItem.create({ data: parsed.data });
  publishEvent({ type: "MENU_UPDATED", restaurantId: parsed.data.restaurantId });

  return NextResponse.json({ item }, { status: 201 });
}
