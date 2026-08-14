import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const qr = await prisma.qRCode.findUnique({
    where: { code },
    include: { table: { include: { restaurant: true } } },
  });

  if (!qr) return NextResponse.json({ error: "This QR code is invalid or expired." }, { status: 404 });

  return NextResponse.json({
    table: { id: qr.table.id, label: qr.table.label, number: qr.table.number },
    restaurant: {
      id: qr.table.restaurant.id,
      name: qr.table.restaurant.name,
      slug: qr.table.restaurant.slug,
      logoUrl: qr.table.restaurant.logoUrl,
    },
  });
}
