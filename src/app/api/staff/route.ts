import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const staff = await prisma.user.findMany({
    where: { restaurantId, role: { in: ["ADMIN", "KITCHEN", "WAITRESS"] } },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ staff });
}

const createStaffSchema = z.object({
  restaurantId: z.string(),
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(6).max(30).optional(),
  password: z.string().min(8).max(100),
  role: z.enum(["ADMIN", "MANAGER", "KITCHEN", "BAR", "WAITRESS", "CASHIER"]),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { password, ...rest } = parsed.data;

  if (!rest.email && !rest.phone) {
    return NextResponse.json({ error: "Provide an email or phone for login" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { ...rest, passwordHash },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
