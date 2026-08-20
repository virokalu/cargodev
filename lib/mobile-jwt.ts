// Signing/verification for /api/v1 bearer access tokens. Pure crypto, no
// Prisma — sibling to lib/r2.ts. Kept separate from lib/auth.ts's NextAuth
// cookie-session JWTs: different secret (MOBILE_JWT_SECRET), different
// lifetime, different verification path (no cookie jar, no getServerSession).
//
// Runs in the Node.js runtime only (the default for Route Handlers) — never
// add `export const runtime = "edge"` to a route that calls this, since
// bcryptjs and the Prisma pg adapter used elsewhere in the mobile auth flow
// need Node.

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import type { StaffRole } from "@prisma/client";
import { env } from "@/lib/env";

export const ACCESS_TOKEN_TTL_SECONDS = 20 * 60; // 20 minutes

const secret = new TextEncoder().encode(env.MOBILE_JWT_SECRET);

export interface AccessTokenPayload {
  sub: string; // user id
  orgId: string;
  role: StaffRole;
  name: string;
  email: string | null;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ orgId: payload.orgId, role: payload.role, name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export class AccessTokenError extends Error {}

/** Throws AccessTokenError on a missing/malformed/expired/bad-signature
 * token — callers (the mobile auth guard) treat any throw as a 401. */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.sub !== "string" ||
      typeof payload.orgId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.name !== "string"
    ) {
      throw new AccessTokenError("Malformed access token payload.");
    }
    return {
      sub: payload.sub,
      orgId: payload.orgId as string,
      role: payload.role as StaffRole,
      name: payload.name as string,
      email: (payload.email as string | null | undefined) ?? null,
    };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) {
      throw new AccessTokenError(error.message);
    }
    throw error;
  }
}
