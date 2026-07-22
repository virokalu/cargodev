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
