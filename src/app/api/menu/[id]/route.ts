import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { auth } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  price: z.number().positive().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  stockQty: z.number().int().optional().nullable(),
  categoryId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.menuItem.update({ where: { id }, data: parsed.data });
  publishEvent({ type: "MENU_UPDATED", restaurantId: item.restaurantId });

  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const item = await prisma.menuItem.delete({ where: { id } });
  publishEvent({ type: "MENU_UPDATED", restaurantId: item.restaurantId });

  return NextResponse.json({ success: true });
}
