// Activity log — append-only. Every mutation writes a row here (CLAUDE.md
// rule 7); this is the one function allowed to insert into ActivityLog.
// Takes `tx` so callers can write the log entry in the same transaction as
// the mutation it's recording — a save that "succeeds" without a log entry
// (or vice versa) would defeat the point of an audit trail.

import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export interface ActivityLogEntry {
  orgId: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export async function record(tx: TxClient, entry: ActivityLogEntry): Promise<void> {
  await tx.activityLog.create({
    data: {
      org_id: entry.orgId,
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before === undefined ? undefined : (entry.before as Prisma.InputJsonValue),
      after: entry.after === undefined ? undefined : (entry.after as Prisma.InputJsonValue),
    },
  });
}
