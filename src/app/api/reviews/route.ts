import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  const all = searchParams.get("all") === "true";
  const search = searchParams.get("search");
  const minRating = searchParams.get("minRating");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  if (all) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!role || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const reviews = await prisma.review.findMany({
    where: {
      restaurantId,
      ...(all ? {} : { isPublished: true }),
      ...(minRating ? { rating: { gte: parseInt(minRating, 10) } } : {}),
      ...(search
        ? {
            OR: [
              { customerName: { contains: search, mode: "insensitive" } },
              { comment: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: all ? 200 : 12,
  });

  return NextResponse.json({ reviews });
}

const createReviewSchema = z.object({
  restaurantId: z.string(),
  orderId: z.string(),
  customerName: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  foodRating: z.number().int().min(1).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  waitTimeRating: z.number().int().min(1).max(5).optional(),
  friendlinessRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
  photoUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Only completed/served orders can be reviewed, and only once each.
  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { review: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "SERVED" && order.status !== "COMPLETED") {
    return NextResponse.json({ error: "This order hasn't been completed yet." }, { status: 409 });
  }
  if (order.review) {
    return NextResponse.json({ error: "A review has already been submitted for this order." }, { status: 409 });
  }

  const review = await prisma.review.create({ data: parsed.data });

  await notifyAdmin(parsed.data.restaurantId, "REVIEW", {
    message: `New ${parsed.data.rating}★ review from ${parsed.data.customerName}`,
    metadata: { reviewId: review.id },
  }).catch(() => null);

  return NextResponse.json({ review }, { status: 201 });
}
