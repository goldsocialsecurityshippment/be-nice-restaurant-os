import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { publishEvent } from "@/lib/events";
import { notifyAdmin } from "@/lib/notifications";

const createSchema = z.object({
  restaurantId: z.string(),
  tableId: z.string(),
  reason: z.enum([
    "CUSTOMER_COMPLAINT",
    "FOOD_TAKING_TOO_LONG",
    "ALLERGY_SPECIAL_REQUEST",
    "PAYMENT_ISSUE",
    "MANAGER_NEEDED",
    "SECURITY_EMERGENCY",
    "OTHER",
  ]),
  note: z.string().max(500).optional(),
  routeToKitchen: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !["WAITRESS", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const helpRequest = await prisma.helpRequest.create({
    data: { ...parsed.data, raisedById: userId },
    include: { table: true, raisedBy: true },
  });

  await prisma.restaurantTable.update({
    where: { id: parsed.data.tableId },
    data: { status: "NEEDS_ATTENTION" },
  });

  publishEvent({
    type: "TABLE_UPDATED",
    restaurantId: parsed.data.restaurantId,
    tableId: parsed.data.tableId,
  });
  publishEvent({
    type: "HELP_REQUEST_CREATED",
    restaurantId: parsed.data.restaurantId,
    helpRequestId: helpRequest.id,
  });

  await notifyAdmin(parsed.data.restaurantId, "HELP_REQUEST", {
    message: `Help requested at ${helpRequest.table.label}: ${helpRequest.reason.replace(/_/g, " ")}`,
    metadata: { helpRequestId: helpRequest.id, table: helpRequest.table.label, reason: helpRequest.reason },
  });

  return NextResponse.json({ helpRequest }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");
  const status = searchParams.get("status");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });

  const helpRequests = await prisma.helpRequest.findMany({
    where: {
      restaurantId,
      ...(status ? { status: { in: status.split(",") as never[] } } : {}),
    },
    include: { table: true, raisedBy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ helpRequests });
}
