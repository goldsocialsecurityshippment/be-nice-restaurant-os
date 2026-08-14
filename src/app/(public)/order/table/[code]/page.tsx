import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function TableOrderEntry({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const qr = await prisma.qRCode.findUnique({ where: { code }, include: { table: true } });

  if (!qr) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="font-display text-2xl text-bn-charcoal">This QR code isn&apos;t recognized</h1>
        <p className="mt-3 text-bn-charcoal-soft">
          Please ask a member of staff for help, or browse our menu directly.
        </p>
      </div>
    );
  }

  // Table status flips to OCCUPIED only once an actual order is placed (see /api/orders),
  // not on a bare scan — someone might scan just to browse the menu.
  redirect(`/menu?table=${code}`);
}
