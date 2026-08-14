import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { publishEvent } from "@/lib/events";

const categorySchema = z.object({
  restaurantId: z.string(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  sortOrder: z.number().int().optional(),
  isWeekendOnly: z.boolean().optional(),
  availableDays: z.string().optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
});

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const category = await prisma.menuCategory.create({ data: parsed.data });
  publishEvent({ type: "MENU_UPDATED", restaurantId: parsed.data.restaurantId });
  return NextResponse.json({ category }, { status: 201 });
}
