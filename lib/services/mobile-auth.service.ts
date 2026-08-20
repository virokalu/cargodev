// Business logic for the /api/v1 bearer-token lifecycle. Login issues an
// access+refresh pair; refresh rotates the refresh token (the old row is
// marked revoked + replacedByTokenId, a new row takes its place, all in one
// transaction); logout revokes on demand. Refresh tokens are opaque
// (crypto.randomBytes) and stored only as a sha256 hash — a leaked DB
// backup alone can't be replayed as a working token.

import { randomBytes, createHash } from "crypto";
import type { Prisma, StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";
import { verifyStaffCredentials } from "@/lib/services/staff-auth.service";
import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from "@/lib/mobile-jwt";
import {
  mobileLoginSchema,
  mobileRefreshSchema,
  mobileLogoutSchema,
} from "@/lib/validation/mobile-auth.schema";
import { flattenFieldErrors } from "@/lib/validation/shared";

const REFRESH_TOKEN_TTL_DAYS = 30;

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface MobileAuthUser {
  id: string;
  name: string;
  email: string | null;
  role: StaffRole;
  orgId: string;
}

export interface MobileAuthResult {
  accessToken: string;
  accessTokenExpiresIn: number; // seconds
  refreshToken: string;
  refreshTokenExpiresAt: string; // ISO date
  user: MobileAuthUser;
}

function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokenPair(user: MobileAuthUser, meta: RequestMeta): Promise<MobileAuthResult> {
  const accessToken = await signAccessToken({
    sub: user.id,
    orgId: user.orgId,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      org_id: user.orgId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      createdByIp: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  return {
    accessToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshTokenExpiresAt: expiresAt.toISOString(),
    user,
  };
}

export async function loginMobile(rawBody: unknown, meta: RequestMeta): Promise<MobileAuthResult> {
  const parsed = mobileLoginSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please check your email and password.",
      flattenFieldErrors(parsed.error)
    );
  }

  // verifyStaffCredentials itself throws ServiceError("FORBIDDEN") for an
  // active lockout — let that propagate as-is, it's already the right shape.
  const verified = await verifyStaffCredentials(parsed.data.email, parsed.data.password);
  if (!verified) {
    throw new ServiceError("VALIDATION", "Invalid email or password.");
  }

  return issueTokenPair(verified, meta);
}

export async function refreshMobileToken(rawBody: unknown, meta: RequestMeta): Promise<MobileAuthResult> {
  const parsed = mobileRefreshSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION", "A refresh token is required.", flattenFieldErrors(parsed.error));
  }

  const tokenHash = hashToken(parsed.data.refreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing || existing.revokedAt || existing.expiresAt <= new Date()) {
    throw new ServiceError("FORBIDDEN", "Session expired. Please sign in again.");
  }

  // Re-check the user fresh from the DB on every rotation — this is what
  // keeps a deactivated account (or a role change) locked out within one
  // refresh cycle, independent of the explicit revocation hooks that
  // user.service.ts calls on deactivation/password change.
  const dbUser = await prisma.user.findFirst({
    where: { id: existing.userId, org_id: existing.org_id, userType: "STAFF", loginEnabled: true },
    select: { id: true, name: true, email: true, role: true, org_id: true },
  });

  if (!dbUser || !dbUser.role) {
    throw new ServiceError("FORBIDDEN", "Session expired. Please sign in again.");
  }
  const user: MobileAuthUser = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    orgId: dbUser.org_id,
  };

  const newRefreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        org_id: user.orgId,
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        createdByIp: meta.ip,
        userAgent: meta.userAgent,
        expiresAt,
      },
    });
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenId: created.id },
    });
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    orgId: user.orgId,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  return {
    accessToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: newRefreshToken,
    refreshTokenExpiresAt: expiresAt.toISOString(),
    user,
  };
}

export async function logoutMobile(rawBody: unknown): Promise<void> {
  const parsed = mobileLogoutSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION", "A refresh token is required.", flattenFieldErrors(parsed.error));
  }

  const tokenHash = hashToken(parsed.data.refreshToken);
  // Idempotent — an already-revoked or unknown token isn't an error, since
  // the end state ("this token no longer works") already holds either way.
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes every active refresh token for a user. Called from
 * user.service.ts's setStaffActive(false) and changeOwnPassword(), inside
 * the same transaction as the mutation that triggers it, so revocation is
 * atomic with the change rather than a best-effort afterthought. */
export async function revokeAllUserTokens(
  tx: Prisma.TransactionClient,
  orgId: string,
  userId: string
): Promise<void> {
  await tx.refreshToken.updateMany({
    where: { org_id: orgId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
