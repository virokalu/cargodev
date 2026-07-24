"use server";

// Thin Server Actions for the "edit your own profile" slice — every action
// does the same three things and nothing more: check the session, call a
// service, shape the result (docs/implementation.md §2, "the thin-wrapper
// rule"). Unlike app/(dashboard)/users/actions.ts, these are NOT admin-gated
// — per US-03 every authenticated staff member edits their own profile.

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/auth-guard";
import { ServiceError, type ServiceErrorCode } from "@/lib/errors";
import * as userService from "@/lib/services/user.service";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; code: ServiceErrorCode; message: string; fieldErrors?: Record<string, string> };

export async function updateProfileDetailsAction(input: unknown): Promise<ProfileActionResult> {
  const user = await requireUser();
  try {
    await userService.updateOwnProfileDetails(user, input);
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

export async function changePasswordAction(input: unknown): Promise<ProfileActionResult> {
  const user = await requireUser();
  try {
    await userService.changeOwnPassword(user, input);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}