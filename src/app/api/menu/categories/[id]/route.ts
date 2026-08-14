import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { publishEvent } from "@/lib/events";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const category = await prisma.menuCategory.update({ where: { id }, data: parsed.data });
  publishEvent({ type: "MENU_UPDATED", restaurantId: category.restaurantId });
  return NextResponse.json({ category });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const category = await prisma.menuCategory.delete({ where: { id } });
  publishEvent({ type: "MENU_UPDATED", restaurantId: category.restaurantId });
  return NextResponse.json({ success: true });
}
