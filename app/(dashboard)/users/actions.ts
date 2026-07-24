"use server";

// Thin Server Actions for the Users (staff) slice — each one does the same
// three things and nothing more: check the session/role, call a service,
// shape the result (docs/implementation.md §2, "the thin-wrapper rule").
//
// Per user_stories.md US-02, only Administrators see or touch this screen at
// all, so every action here is gated to ADMINISTRATOR.

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/auth-guard";
import { ServiceError, type ServiceErrorCode } from "@/lib/errors";
import * as userService from "@/lib/services/user.service";

const ADMIN_ONLY = ["ADMINISTRATOR"] as const;

export type StaffActionResult =
  | { ok: true }
  | { ok: false; code: ServiceErrorCode; message: string; fieldErrors?: Record<string, string> };

export async function createStaffAction(input: unknown): Promise<StaffActionResult> {
  const user = await requireUser([...ADMIN_ONLY]);
  try {
    await userService.createStaff(user, input);
    revalidatePath("/users");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateStaffAction(staffId: string, input: unknown): Promise<StaffActionResult> {
  const user = await requireUser([...ADMIN_ONLY]);
  try {
    await userService.updateStaff(user, staffId, input);
    revalidatePath("/users");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

export async function setStaffActiveAction(staffId: string, active: boolean): Promise<StaffActionResult> {
  const user = await requireUser([...ADMIN_ONLY]);
  try {
    await userService.setStaffActive(user, staffId, active);
    revalidatePath("/users");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}
