// Vehicle Remarks — append-only thread per vehicle (Tech Doc §6, schema
// model RemarkEntry). CLAUDE.md rule: "Remarks are append-only. Never
// editable or deletable; each entry stores author + timestamp." There is
// deliberately no updateRemark/deleteRemark here — this file only ever
// grows the thread, never changes or removes an entry.

import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";
import type { SessionUser } from "@/lib/services/auth-guard";
import * as activityLog from "@/lib/services/activity-log.service";

export interface RemarkListItem {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string;
}

const REMARK_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { name: true } },
} satisfies import("@prisma/client").Prisma.RemarkEntrySelect;

/** Fetches one vehicle row scoped to the org, or throws NOT_FOUND — same
 * ownership check every other vehicle-scoped write already uses. */
async function getOwnedVehicle(orgId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.org_id !== orgId || vehicle.deletedAt !== null) {
    throw new ServiceError("NOT_FOUND", "Vehicle not found.");
  }
  return vehicle;
}

/** Oldest first — reads top-to-bottom like a conversation, newest entry at
 * the bottom next to the add-remark box. */
export async function listRemarks(orgId: string, vehicleId: string): Promise<RemarkListItem[]> {
  await getOwnedVehicle(orgId, vehicleId);
  const remarks = await prisma.remarkEntry.findMany({
    where: { vehicleId },
    select: REMARK_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return remarks.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    authorName: r.author.name,
  }));
}

export async function addRemark(
  actor: SessionUser,
  vehicleId: string,
  rawBody: string
): Promise<RemarkListItem> {
  await getOwnedVehicle(actor.orgId, vehicleId);

  const body = rawBody.trim();
  if (!body) {
    throw new ServiceError("VALIDATION", "Remark can't be empty.", { body: "Enter a remark" });
  }
  if (body.length > 2000) {
    throw new ServiceError("VALIDATION", "Remark must be 2000 characters or fewer.", {
      body: "Must be 2000 characters or fewer",
    });
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.remarkEntry.create({
      data: { vehicleId, authorId: actor.id, body },
      select: REMARK_SELECT,
    });

    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "ADD_VEHICLE_REMARK",
      entity: "Vehicle",
      entityId: vehicleId,
      after: { body },
    });

    return { id: created.id, body: created.body, createdAt: created.createdAt, authorName: created.author.name };
  });
}
