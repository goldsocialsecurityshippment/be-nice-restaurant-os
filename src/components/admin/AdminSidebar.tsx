"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";

const NAV = [
  { href: "/admin", label: "Overview", exact: true, adminOnly: false },
  { href: "/admin/orders", label: "Orders", adminOnly: false },
  { href: "/admin/menu", label: "Menu", adminOnly: true },
  { href: "/admin/tables", label: "Tables & QR", adminOnly: false },
  { href: "/admin/reviews", label: "Reviews", adminOnly: false },
  { href: "/admin/staff", label: "Staff", adminOnly: false },
  { href: "/admin/analytics", label: "Analytics", adminOnly: false },
  { href: "/admin/reports", label: "Reports", adminOnly: false },
  { href: "/admin/activity", label: "Activity", adminOnly: false },
  { href: "/admin/settings", label: "Settings", adminOnly: true },
];

function NavLinks({ pathname, viewerRole, onNavigate }: { pathname: string; viewerRole: string; onNavigate?: () => void }) {
  const visible = NAV.filter((item) => !item.adminOnly || viewerRole === "ADMIN");
  return (
    <>
      {visible.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-bn-red text-bn-cream" : "text-bn-cream/70 hover:bg-bn-cream/10"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminSidebar({ restaurantId, viewerRole }: { restaurantId?: string; viewerRole: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-bn-gold/20 bg-bn-charcoal px-4 py-3 text-bn-cream md:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-2xl leading-none" aria-label="Open menu">
          ☰
        </button>
        <p className="font-display text-sm font-semibold">Be-Nice Admin</p>
        {restaurantId ? <NotificationBell restaurantId={restaurantId} variant="dark" /> : <span className="w-6" />}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-bn-charcoal p-4 text-bn-cream">
            <div className="mb-4 flex items-center justify-between">
              <Image src="/brand/be-nice-logo.png" alt="Be-Nice" width={32} height={32} className="rounded-full" />
              <button onClick={() => setMobileOpen(false)} className="text-xl">✕</button>
            </div>
            <nav className="space-y-1">
              <NavLinks pathname={pathname} viewerRole={viewerRole} onNavigate={() => setMobileOpen(false)} />
            </nav>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-4 w-full rounded-lg border-t border-bn-cream/10 px-3 py-2 text-left text-sm text-bn-cream/60"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-bn-gold/20 bg-bn-charcoal text-bn-cream md:flex">
        <div className="flex items-center justify-between gap-3 border-b border-bn-cream/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <Image src="/brand/be-nice-logo.png" alt="Be-Nice" width={36} height={36} className="rounded-full" />
            <div>
              <p className="font-display text-sm font-semibold leading-tight">Be-Nice Admin</p>
              <p className="text-[10px] text-bn-cream/50">Coratech Restaurant OS</p>
            </div>
          </div>
          {restaurantId && <NotificationBell restaurantId={restaurantId} variant="dark" />}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <NavLinks pathname={pathname} viewerRole={viewerRole} />
        </nav>
        <div className="border-t border-bn-cream/10 p-3">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-bn-cream/60 hover:bg-bn-cream/10"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
