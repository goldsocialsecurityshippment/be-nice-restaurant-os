import { SiteFooter } from "@/components/shared/SiteFooter";
import { CartProvider } from "@/lib/cart-context";
import { CartAwareHeader } from "@/components/shared/CartAwareHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <CartAwareHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
