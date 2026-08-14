import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type ReceiptOrder = {
  orderNumber: string;
  type: string;
  paymentStatus: string;
  createdAt: Date;
  customerName: string | null;
  table: { label: string } | null;
  items: {
    nameSnapshot: string;
    quantity: number;
    priceSnapshot: unknown;
    lineTotal: unknown;
  }[];
  subtotal: unknown;
  total: unknown;
};

/**
 * Generates a simple, professional PDF receipt for an order —
 * used for both the customer-facing download and the admin copy.
 * Returns raw bytes.
 */
export async function generateReceiptPdf(
  order: ReceiptOrder,
  restaurantName: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 500 + order.items.length * 16]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = page.getHeight() - 40;
  const left = 20;

  const black = rgb(0.14, 0.11, 0.09);
  const gray = rgb(0.4, 0.36, 0.33);

  // pdf-lib's standard fonts cannot encode the Ghana cedi symbol (₵).
  // Convert currency output to GHS for PDF compatibility.
  function pdfCurrency(value: string): string {
    return formatCurrency(value).replace(/₵/g, "GHS ");
  }

  function line(
    text: string,
    opts: {
      size?: number;
      useBold?: boolean;
      color?: ReturnType<typeof rgb>;
      gap?: number;
    } = {}
  ) {
    const {
      size = 10,
      useBold = false,
      color = black,
      gap = 16,
    } = opts;

    page.drawText(text, {
      x: left,
      y,
      size,
      font: useBold ? bold : font,
      color,
    });

    y -= gap;
  }

  line(restaurantName, {
    size: 16,
    useBold: true,
    gap: 22,
  });

  line("Official Receipt", {
    size: 9,
    color: gray,
    gap: 20,
  });

  line(`Order Number: ${order.orderNumber}`, {
    useBold: true,
  });

  line(`Date: ${formatDateTime(order.createdAt)}`, {
    size: 9,
    color: gray,
  });

  line(
    `Type: ${
      order.type === "DINE_IN" ? "Dine In" : "Pickup"
    }${order.table ? ` - ${order.table.label}` : ""}`,
    {
      size: 9,
      color: gray,
    }
  );

  if (order.customerName) {
    line(`Customer: ${order.customerName}`, {
      size: 9,
      color: gray,
    });
  }

  line(`Payment: ${order.paymentStatus}`, {
    size: 9,
    color: gray,
    gap: 20,
  });

  line("Items", {
    useBold: true,
    gap: 16,
  });

  for (const item of order.items) {
    line(`${item.nameSnapshot} x${item.quantity}`, {
      size: 9,
    });

    page.drawText(pdfCurrency(item.lineTotal as string), {
      x: page.getWidth() - 80,
      y: y + 16,
      size: 9,
      font,
      color: black,
    });
  }

  y -= 8;

  page.drawLine({
    start: {
      x: left,
      y,
    },
    end: {
      x: page.getWidth() - 20,
      y,
    },
    thickness: 0.5,
    color: gray,
  });

  y -= 16;

  line(`Subtotal: ${pdfCurrency(order.subtotal as string)}`, {
    size: 9,
    color: gray,
  });

  line(`Total: ${pdfCurrency(order.total as string)}`, {
    size: 12,
    useBold: true,
  });

  y -= 10;

  line("Thank you for choosing us!", {
    size: 9,
    color: gray,
  });

  return doc.save();
}