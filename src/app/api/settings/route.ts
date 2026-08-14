import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const [settings, restaurant] = await Promise.all([
    prisma.settings.findUnique({ where: { restaurantId } }),
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
  ]);

  return NextResponse.json({ settings, restaurant });
}

const updateSchema = z.object({
  estimatedPrepMinLow: z.number().int().positive().optional(),
  estimatedPrepMinHigh: z.number().int().positive().optional(),
  acceptingOrders: z.boolean().optional(),
  waitressServesDrinks: z.boolean().optional(),
  currency: z.string().optional(),
  // Restaurant-level fields
  name: z.string().min(1).optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
  address: z.string().optional(),
  instagram: z.string().optional(),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { estimatedPrepMinLow, estimatedPrepMinHigh, acceptingOrders, waitressServesDrinks, currency, ...restaurantFields } =
    parsed.data;

  const [settings, restaurant] = await Promise.all([
    prisma.settings.update({
      where: { restaurantId },
      data: { estimatedPrepMinLow, estimatedPrepMinHigh, acceptingOrders, waitressServesDrinks, currency },
    }),
    Object.keys(restaurantFields).length > 0
      ? prisma.restaurant.update({ where: { id: restaurantId }, data: restaurantFields })
      : prisma.restaurant.findUnique({ where: { id: restaurantId } }),
  ]);

  return NextResponse.json({ settings, restaurant });
}
