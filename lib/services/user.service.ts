// Staff (userType = STAFF) management service — CD-D2-16. Server Actions in
// app/(dashboard)/users/actions.ts are thin wrappers that call this; nothing
// here is UI-specific (CLAUDE.md rule 2).
//
// Role changes are gated here as well as at the Server Action layer
// (requireUser(["ADMINISTRATOR"])) — CLAUDE.md's RBAC rule says enforcement
// must not rely on the UI alone, so this check has to hold even if a future
// caller reaches updateStaff() a different way.

import bcrypt from "bcryptjs";
import { Prisma, type StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";
import type { SessionUser } from "@/lib/services/auth-guard";
import {
  staffCreateSchema,
  staffUpdateSchema,
} from "@/lib/validation/user.schema";
import {
  profileDetailsSchema,
  changePasswordSchema,
} from "@/lib/validation/profile.schema";
import { flattenFieldErrors } from "@/lib/validation/shared";
import * as activityLog from "@/lib/services/activity-log.service";

const PASSWORD_SALT_ROUNDS = 10;

export interface StaffListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  loginEnabled: boolean;
  lastActiveAt: Date | null;
}

const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  loginEnabled: true,
  lastActiveAt: true,
} satisfies Prisma.UserSelect;

export async function listStaff(orgId: string, query?: string): Promise<StaffListItem[]> {
  const q = query?.trim();
  const staff = await prisma.user.findMany({
    where: {
      org_id: orgId,
      userType: "STAFF",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: STAFF_SELECT,
    orderBy: { name: "asc" },
  });
  // role/email are non-null for STAFF rows by construction — narrow the type
  // once here instead of forcing every caller to handle the customer case.
  return staff as StaffListItem[];
}

/** Fetches one staff row scoped to the org, or throws NOT_FOUND. */
async function getOwnedStaff(orgId: string, staffId: string) {
  const existing = await prisma.user.findUnique({ where: { id: staffId } });
  if (!existing || existing.org_id !== orgId || existing.userType !== "STAFF") {
    throw new ServiceError("NOT_FOUND", "Staff account not found.");
  }
  return existing;
}

export async function createStaff(actor: SessionUser, rawInput: unknown): Promise<StaffListItem> {
  const parsed = staffCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please fix the highlighted fields.",
      flattenFieldErrors(parsed.error)
    );
  }
  const input = parsed.data;
  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          org_id: actor.orgId,
          userType: "STAFF",
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: input.role,
          password: passwordHash,
          loginEnabled: true,
        },
        select: STAFF_SELECT,
      });

      await activityLog.record(tx, {
        orgId: actor.orgId,
        actorId: actor.id,
        action: "CREATE_STAFF",
        entity: "User",
        entityId: created.id,
        after: JSON.parse(JSON.stringify(created)),
      });

      // role is non-null here — it was just written above as a required
      // StaffRole, unlike the nullable column Prisma's type reflects for the
      // shared User model (customers have no role).
      return created as StaffListItem;
    });
  } catch (error) {
    // @@unique([org_id, email]) — surfaced as a field error rather than a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ServiceError("CONFLICT", "A staff account with this email already exists.", {
        email: "Email already in use",
      });
    }
    throw error;
  }
}

export async function updateStaff(
  actor: SessionUser,
  staffId: string,
  rawInput: unknown
): Promise<StaffListItem> {
  const parsed = staffUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please fix the highlighted fields.",
      flattenFieldErrors(parsed.error)
    );
  }
  const input = parsed.data;
  const existing = await getOwnedStaff(actor.orgId, staffId);

  // Admin roles are only editable by admins — the page itself is
  // Admin-gated, but this check is the layer that actually holds if
  // updateStaff is ever called a different way (CLAUDE.md RBAC rule).
  if (input.role !== existing.role && actor.role !== "ADMINISTRATOR") {
    throw new ServiceError(
      "FORBIDDEN",
      "Only an administrator can change a staff member's role.",
      { role: "Only an administrator can change roles" }
    );
  }

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS)
    : undefined;

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: staffId },
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: input.role,
          loginEnabled: input.active,
          ...(passwordHash ? { password: passwordHash } : {}),
        },
        select: STAFF_SELECT,
      });

      await activityLog.record(tx, {
        orgId: actor.orgId,
        actorId: actor.id,
        action: "UPDATE_STAFF",
        entity: "User",
        entityId: updated.id,
        before: {
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          role: existing.role,
          loginEnabled: existing.loginEnabled,
        },
        after: JSON.parse(JSON.stringify(updated)),
      });

      return updated as StaffListItem;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ServiceError("CONFLICT", "A staff account with this email already exists.", {
        email: "Email already in use",
      });
    }
    throw error;
  }
}

export async function setStaffActive(
  actor: SessionUser,
  staffId: string,
  active: boolean
): Promise<StaffListItem> {
  const existing = await getOwnedStaff(actor.orgId, staffId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: staffId },
      data: { loginEnabled: active },
      select: STAFF_SELECT,
    });

    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: active ? "ACTIVATE_STAFF" : "DEACTIVATE_STAFF",
      entity: "User",
      entityId: updated.id,
      before: { loginEnabled: existing.loginEnabled },
      after: { loginEnabled: updated.loginEnabled },
    });

    return updated as StaffListItem;
  });
}

// ─────────────────────────────────────────────
// OWN PROFILE — every user (any role) edits their own name/phone/password.
// Unlike the staff-management functions above, these never take a `staffId`
// argument — they only ever act on `actor.id`, so there's no owned-record
// lookup to bypass and no role gate to enforce (CD-D2-17, US-03).
// ─────────────────────────────────────────────

export interface OwnProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
}

const OWN_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
} satisfies Prisma.UserSelect;

export async function getOwnProfile(orgId: string, userId: string): Promise<OwnProfile> {
  const profile = await prisma.user.findFirst({
    where: { id: userId, org_id: orgId },
    select: OWN_PROFILE_SELECT,
  });
  if (!profile) {
    throw new ServiceError("NOT_FOUND", "Profile not found.");
  }
  // role is non-null here — every STAFF row has one; only customers don't,
  // and only STAFF users hold a session that can call this.
  return profile as OwnProfile;
}

export async function updateOwnProfileDetails(
  actor: SessionUser,
  rawInput: unknown
): Promise<OwnProfile> {
  const parsed = profileDetailsSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please fix the highlighted fields.",
      flattenFieldErrors(parsed.error)
    );
  }
  const input = parsed.data;
  const existing = await getOwnProfile(actor.orgId, actor.id);

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: actor.id },
        data: { name: input.name, email: input.email, phone: input.phone },
        select: OWN_PROFILE_SELECT,
      });

      await activityLog.record(tx, {
        orgId: actor.orgId,
        actorId: actor.id,
        action: "UPDATE_PROFILE",
        entity: "User",
        entityId: actor.id,
        before: { name: existing.name, email: existing.email, phone: existing.phone },
        after: { name: updated.name, email: updated.email, phone: updated.phone },
      });

      return updated as OwnProfile;
    });
  } catch (error) {
    // @@unique([org_id, email]) — surfaced as a field error rather than a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ServiceError("CONFLICT", "An account with this email already exists.", {
        email: "Email already in use",
      });
    }
    throw error;
  }
}

export async function changeOwnPassword(actor: SessionUser, rawInput: unknown): Promise<void> {
  const parsed = changePasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please fix the highlighted fields.",
      flattenFieldErrors(parsed.error)
    );
  }
  const input = parsed.data;

  // Never trust the JWT session for the password hash — fetch it fresh so a
  // stale/forged session can't skip the current-password check.
  const existing = await prisma.user.findFirst({
    where: { id: actor.id, org_id: actor.orgId },
    select: { password: true },
  });
  if (!existing?.password) {
    throw new ServiceError("NOT_FOUND", "Account not found.");
  }

  const currentValid = await bcrypt.compare(input.currentPassword, existing.password);
  if (!currentValid) {
    throw new ServiceError("VALIDATION", "Current password is incorrect.", {
      currentPassword: "Current password is incorrect",
    });
  }

  const passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: actor.id }, data: { password: passwordHash } });

    // No before/after snapshot here — a password hash has no business being
    // written to the audit trail, even hashed.
    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "CHANGE_PASSWORD",
      entity: "User",
      entityId: actor.id,
    });
  });
}
