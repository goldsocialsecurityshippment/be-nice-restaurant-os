import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireStaff() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return !!role && role !== "CUSTOMER";
}

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { restaurantId, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.object({
  action: z.enum(["MARK_READ", "MARK_ALL_READ", "CLEAR_ALL"]),
  restaurantId: z.string(),
  notificationId: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { action, restaurantId, notificationId } = parsed.data;

  if (action === "MARK_READ" && notificationId) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  } else if (action === "MARK_ALL_READ") {
    await prisma.notification.updateMany({
      where: { restaurantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  } else if (action === "CLEAR_ALL") {
    await prisma.notification.deleteMany({ where: { restaurantId } });
  }

  return NextResponse.json({ success: true });
}
