// Customer (userType = CUSTOMER) service — Tech Doc §5, CD-D2-14/15. Two
// tiers of functions live here:
//   - searchCustomers / createCustomer: the minimal slice the Add Vehicle
//     Customer combobox needs (search existing, create a name-only one inline).
//   - listCustomers / createCustomerFull / updateCustomer: the full Customers
//     screen (separate from Users — Tech Doc §5, US-29).
//
// Customers are User rows with userType = CUSTOMER — no uniqueness
// constraint on name, since people can legitimately share names.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";
import type { SessionUser } from "@/lib/services/auth-guard";
import {
  customerCreateSchema,
  customerUpdateSchema,
} from "@/lib/validation/customer.schema";
import { flattenFieldErrors } from "@/lib/validation/shared";
import * as activityLog from "@/lib/services/activity-log.service";

export interface CustomerOption {
  id: string;
  name: string;
}

export async function searchCustomers(orgId: string, query: string): Promise<CustomerOption[]> {
  return prisma.user.findMany({
    where: {
      org_id: orgId,
      userType: "CUSTOMER",
      name: { contains: query, mode: "insensitive" },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 20,
  });
}

export async function createCustomer(orgId: string, name: string): Promise<CustomerOption> {
  return prisma.user.create({
    data: {
      org_id: orgId,
      userType: "CUSTOMER",
      name: name.trim(),
      loginEnabled: false,
    },
    select: { id: true, name: true },
  });
}

// ── Full Customers screen (CD-D2-15) ────────────────────────────────────────

export interface CustomerListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  createdAt: Date;
  vehicleCount: number;
}

const CUSTOMER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  country: true,
  address: true,
  createdAt: true,
  _count: { select: { vehicles: true } },
} satisfies Prisma.UserSelect;

function toListItem(row: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  createdAt: Date;
  _count: { vehicles: number };
}): CustomerListItem {
  const { _count, ...rest } = row;
  return { ...rest, vehicleCount: _count.vehicles };
}

export async function listCustomers(orgId: string, query?: string): Promise<CustomerListItem[]> {
  const q = query?.trim();
  const customers = await prisma.user.findMany({
    where: {
      org_id: orgId,
      userType: "CUSTOMER",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: CUSTOMER_SELECT,
    orderBy: { name: "asc" },
  });
  return customers.map(toListItem);
}

/** Fetches one customer row scoped to the org, or throws NOT_FOUND. */
async function getOwnedCustomer(orgId: string, customerId: string) {
  const existing = await prisma.user.findUnique({ where: { id: customerId } });
  if (!existing || existing.org_id !== orgId || existing.userType !== "CUSTOMER") {
    throw new ServiceError("NOT_FOUND", "Customer not found.");
  }
  return existing;
}

export async function createCustomerFull(
  actor: SessionUser,
  rawInput: unknown
): Promise<CustomerListItem> {
  const parsed = customerCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please fix the highlighted fields.",
      flattenFieldErrors(parsed.error)
    );
  }
  const input = parsed.data;

  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        org_id: actor.orgId,
        userType: "CUSTOMER",
        name: input.name,
        email: input.email,
        phone: input.phone,
        country: input.country,
        address: input.address,
        loginEnabled: false,
      },
      select: CUSTOMER_SELECT,
    });

    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "CREATE_CUSTOMER",
      entity: "User",
      entityId: created.id,
      after: JSON.parse(JSON.stringify(created)),
    });

    return toListItem(created);
  });
}

export async function updateCustomer(
  actor: SessionUser,
  customerId: string,
  rawInput: unknown
): Promise<CustomerListItem> {
  const parsed = customerUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please fix the highlighted fields.",
      flattenFieldErrors(parsed.error)
    );
  }
  const input = parsed.data;
  const existing = await getOwnedCustomer(actor.orgId, customerId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: customerId },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        country: input.country,
        address: input.address,
      },
      select: CUSTOMER_SELECT,
    });

    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "UPDATE_CUSTOMER",
      entity: "User",
      entityId: updated.id,
      before: {
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        country: existing.country,
        address: existing.address,
      },
      after: JSON.parse(JSON.stringify(updated)),
    });

    return toListItem(updated);
  });
}
