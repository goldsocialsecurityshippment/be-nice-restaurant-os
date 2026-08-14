import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Each route prefix maps to the roles allowed in (besides ADMIN, which can access everything).
const ROLE_ROUTE_PREFIXES: Record<string, string[]> = {
  "/admin": ["ADMIN", "MANAGER"],
  "/kitchen": ["KITCHEN"],
  "/bar": ["BAR"],
  "/waitress": ["WAITRESS"],
  "/cashier": ["CASHIER"],
};

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const matchedPrefix = Object.keys(ROLE_ROUTE_PREFIXES).find((p) => pathname.startsWith(p));
  if (!matchedPrefix) return NextResponse.next();

  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || !role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowedRoles = ROLE_ROUTE_PREFIXES[matchedPrefix];
  // ADMIN can access everything, for oversight.
  if (role !== "ADMIN" && !allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/login?error=forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/bar/:path*", "/waitress/:path*", "/cashier/:path*"],
};
