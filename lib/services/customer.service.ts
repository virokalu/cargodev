// Minimal customer slice needed by the vehicle Customer field. The full
// Customers screens (list/profile/edit) are a separate task — this only
// covers what the Add Vehicle combobox needs: search existing customers, and
// create a name-only one inline.
//
// Customers are User rows with userType = CUSTOMER (Tech Doc §5) — no
// uniqueness constraint on name, since people can legitimately share names.

import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";

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

/** Resolves a single customer's label for the vehicle filter panel. */
export async function getCustomerById(orgId: string, id: string): Promise<CustomerOption | null> {
  const customer = await prisma.user.findFirst({
    where: { id, org_id: orgId, userType: "CUSTOMER" },
    select: { id: true, name: true },
  });
  return customer ?? null;
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

/** Rename only — unlike the lookup services, this never checks for a
 * duplicate name (customers can legitimately share a name, see above). */
export async function renameCustomer(
  orgId: string,
  id: string,
  newName: string
): Promise<CustomerOption> {
  const trimmed = newName.trim();
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current || current.org_id !== orgId || current.userType !== "CUSTOMER") {
    throw new ServiceError("NOT_FOUND", "Customer not found.");
  }

  return prisma.user.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}
