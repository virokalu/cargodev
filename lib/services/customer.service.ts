// Minimal customer slice needed by the vehicle Customer field. The full
// Customers screens (list/profile/edit) are a separate task — this only
// covers what the Add Vehicle combobox needs: search existing customers, and
// create a name-only one inline.
//
// Customers are User rows with userType = CUSTOMER (Tech Doc §5) — no
// uniqueness constraint on name, since people can legitimately share names.

import { prisma } from "@/lib/prisma";

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
