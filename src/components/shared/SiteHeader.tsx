"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SiteHeader({ cartCount }: { cartCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/#about", label: "About" },
    { href: "/#location", label: "Find Us" },
    { href: "/order/track", label: "Track Order" },
  ];

  return (
    <header className="relative z-[100] border-b border-bn-gold/20 bg-bn-cream">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 md:h-auto md:py-4">
        {/* Brand */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3"
        >
          <Image
            src="/images/logo.jpeg"
            alt="Be-Nice Catering Services"
            width={52}
            height={52}
            className="h-[48px] w-[48px] rounded-sm object-contain md:h-[56px] md:w-[56px]"
          />

          <div>
            <div className="font-display text-[20px] font-bold leading-none text-bn-charcoal md:text-xl">
              Be nice
            </div>

            <div className="mt-1 text-[12px] leading-none text-bn-charcoal-soft md:text-xs">
              Catering services
            </div>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.slice(0, 4).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium text-bn-charcoal-soft transition hover:text-bn-red",
                pathname === link.href && "text-bn-red"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/order/track"
            className="inline-flex items-center rounded-full border border-bn-red px-4 py-2 text-sm font-semibold text-bn-red transition hover:bg-bn-red/5"
          >
            Track Order
          </Link>

          <Link
            href="/menu"
            className="relative inline-flex items-center gap-2 rounded-full bg-bn-red px-4 py-2 text-sm font-semibold text-bn-cream transition hover:bg-bn-red-dark"
          >
            Order Online

            {!!cartCount && cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bn-gold text-[11px] font-bold text-bn-charcoal">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex h-11 w-11 items-center justify-center text-bn-charcoal md:hidden"
        >
          <span
            aria-hidden="true"
            className="text-[34px] font-light leading-none"
          >
            {open ? "×" : "☰"}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-[105] border-t border-bn-gold/20 bg-bn-cream shadow-xl md:hidden">
          <nav className="px-5 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block border-b border-bn-charcoal/10 py-4 text-base font-semibold text-bn-charcoal transition hover:text-bn-red",
                  pathname === link.href && "text-bn-red"
                )}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/menu"
              onClick={() => setOpen(false)}
              className="relative mt-4 block rounded-full bg-bn-red px-5 py-3.5 text-center text-sm font-semibold text-bn-cream transition hover:bg-bn-red-dark"
            >
              Order Online

              {!!cartCount && cartCount > 0 && (
                <span className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-bn-gold text-[11px] font-bold text-bn-charcoal">
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
