import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Server-side page guard.
 *
 * ADMIN has full access.
 * Other roles must explicitly appear in allowedRoles.
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!role) {
    redirect("/login");
  }

  if (role !== "ADMIN" && !allowedRoles.includes(role)) {
    redirect("/login?error=forbidden");
  }

  return role;
}

export async function getSessionRole(): Promise<string | undefined> {
  const session = await auth();

  return (session?.user as { role?: string } | undefined)?.role;
}