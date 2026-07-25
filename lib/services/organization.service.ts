// Organization lookup. Phase 1 has exactly one org (env.ORG_ID), but this
// still takes orgId as a parameter rather than reading env.ORG_ID itself —
// keeps it ready for Phase 2 multi-tenant routing with no signature change.

import { prisma } from "@/lib/prisma";

export async function getOrganizationName(orgId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  // Falls back to the seeded name if the row is ever missing — display text
  // should never crash a page render.
  return org?.name ?? "Global Motors (Pvt) Ltd";
}
