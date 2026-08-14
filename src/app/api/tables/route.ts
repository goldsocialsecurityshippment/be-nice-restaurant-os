import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();

  return (
    (session?.user as { role?: string } | undefined)?.role === "ADMIN"
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json(
      { error: "restaurantId is required" },
      { status: 400 }
    );
  }

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId },

    include: {
      qrCode: true,

      seats: {
        orderBy: { seatNumber: "asc" },
        include: {
          updatedBy: {
            select: { name: true },
          },
        },
      },

      // Only genuinely active orders should appear here.
      // SERVED orders are finished and should no longer count
      // as active orders for the table.
      orders: {
        where: {
          status: {
            notIn: ["SERVED", "COMPLETED", "CANCELLED"],
          },
        },
        include: {
          items: true,
        },
      },
    },

    orderBy: {
      number: "asc",
    },
  });

  return NextResponse.json({ tables });
}

const createTableSchema = z.object({
  restaurantId: z.string(),
  label: z.string().min(1).max(60),
  number: z.number().int().positive(),
  capacity: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const body = await req.json();

  const parsed = createTableSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    restaurantId,
    label,
    number,
    capacity,
  } = parsed.data;

  const seatCount = capacity ?? 4;

  const table = await prisma.restaurantTable.create({
    data: {
      restaurantId,
      label,
      number,
      capacity: seatCount,

      seats: {
        create: Array.from(
          { length: seatCount },
          (_, i) => ({
            seatNumber: i + 1,
          })
        ),
      },
    },

    include: {
      seats: true,
    },
  });

  const code = crypto.randomBytes(12).toString("hex");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const targetUrl =
    `${baseUrl}/order/table/${code}`;

  const imageDataUrl = await QRCode.toDataURL(
    targetUrl,
    {
      margin: 2,
      width: 480,
      color: {
        dark: "#2B2320",
        light: "#FBF7F0",
      },
    }
  );

  const qrCode = await prisma.qRCode.create({
    data: {
      tableId: table.id,
      code,
      targetUrl,
      imageDataUrl,
    },
  });

  return NextResponse.json(
    {
      table: {
        ...table,
        qrCode,
      },
    },
    { status: 201 }
  );
}