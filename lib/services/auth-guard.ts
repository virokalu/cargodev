// Server-side auth guard — call at the top of any Server Component or layout
// that requires authentication.
//
// Full role-based enforcement (CD-D3-18) will build on this foundation.
// For now: redirect to /login if no session, otherwise return the session user.

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { StaffRole } from "@prisma/client";
import type { Session } from "next-auth";

export type SessionUser = NonNullable<Session["user"]>;

/**
 * Require an authenticated staff session.
 *
 * @param allowedRoles - Optional whitelist of roles. If omitted, any authenticated
 *   staff user is allowed. If provided and the user's role is not in the list,
 *   they are redirected to the dashboard (role check enforcement comes in CD-D3-18).
 *
 * Usage in a Server Component:
 *   const user = await requireUser();
 *   const adminUser = await requireUser(["ADMINISTRATOR"]);
 */
export async function requireUser(
  allowedRoles?: StaffRole[]
): Promise<SessionUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    // Redirect to dashboard — a proper 403 page can be added in CD-D3-18.
    redirect("/dashboard");
  }

  return session.user;
}
