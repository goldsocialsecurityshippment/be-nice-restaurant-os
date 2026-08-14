import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdf } from "@/lib/receipt";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, table: true, restaurant: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const pdfBytes = await generateReceiptPdf(order, order.restaurant.name);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${order.orderNumber}.pdf"`,
    },
  });
}
