"use client";

import { SiteHeader } from "@/components/shared/SiteHeader";
import { useCart } from "@/lib/cart-context";

export function CartAwareHeader() {
  const { itemCount } = useCart();
  return <SiteHeader cartCount={itemCount} />;
}
