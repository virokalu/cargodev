"use server";

// Thin Server Actions for the Customers slice (docs/implementation.md §2).
// Per user_stories.md US-02, Manager and above manage customers — Viewer and
// Operator can view the list (requireUser() with no role list) but writes
// are gated to Manager+.

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/auth-guard";
import { ServiceError, type ServiceErrorCode } from "@/lib/errors";
import * as customerService from "@/lib/services/customer.service";

const CAN_MANAGE_CUSTOMERS = ["ADMINISTRATOR", "MANAGER"] as const;

export type CustomerActionResult =
  | { ok: true }
  | { ok: false; code: ServiceErrorCode; message: string; fieldErrors?: Record<string, string> };

export async function createCustomerFullAction(input: unknown): Promise<CustomerActionResult> {
  const user = await requireUser([...CAN_MANAGE_CUSTOMERS]);
  try {
    await customerService.createCustomerFull(user, input);
    revalidatePath("/customers");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateCustomerAction(
  customerId: string,
  input: unknown
): Promise<CustomerActionResult> {
  const user = await requireUser([...CAN_MANAGE_CUSTOMERS]);
  try {
    await customerService.updateCustomer(user, customerId, input);
    revalidatePath("/customers");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}
