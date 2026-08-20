// Non-redirecting auth guard for /api/v1/* Route Handlers. Mirrors
// lib/services/auth-guard.ts's requireUser() but for a bearer-token request
// instead of a cookie session — requireUser() redirects on failure, which
// is right for Server Components and wrong for a JSON API (same reasoning
// documented in app/api/uploads/presign/route.ts).

import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import type { StaffRole } from "@prisma/client";
import type { SessionUser } from "@/lib/services/auth-guard";
import { verifyAccessToken, AccessTokenError } from "@/lib/mobile-jwt";
import { apiUnauthenticated, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export type MobileAuthOutcome =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/**
 * Verifies the `Authorization: Bearer <token>` header on a mobile API
 * request. No DB re-check per request — this deliberately mirrors the
 * staleness model the web cookie session already has (a NextAuth JWT
 * session can be stale for up to its 8h maxAge), just with a much tighter
 * 20-minute window here. `refreshMobileToken` re-checks loginEnabled/role
 * fresh from the DB on every rotation, so a deactivated account is locked
 * out within one refresh cycle even without an explicit revocation.
 *
 * Usage in a route handler:
 *   const auth = await requireMobileUser(request);
 *   if (!auth.ok) return auth.response;
 *   const { orgId } = auth.user;
 */
export async function requireMobileUser(
  request: NextRequest,
  allowedRoles?: StaffRole[]
): Promise<MobileAuthOutcome> {
  const header = request.headers.get("authorization");
  const token = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    return { ok: false, response: apiUnauthenticated("Missing bearer token.") };
  }

  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof AccessTokenError) {
      return { ok: false, response: apiUnauthenticated("Invalid or expired token.") };
    }
    throw error;
  }

  const user: SessionUser = {
    id: payload.sub,
    role: payload.role,
    orgId: payload.orgId,
    name: payload.name,
    email: payload.email,
  };

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: apiError(
        new ServiceError("FORBIDDEN", "You don't have permission to access this resource.")
      ),
    };
  }

  return { ok: true, user };
}
