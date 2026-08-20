// Activity log — append-only. Every mutation writes a row here (CLAUDE.md
// rule 7); record() is the one function allowed to insert into ActivityLog.
// Takes `tx` so callers can write the log entry in the same transaction as
// the mutation it's recording — a save that "succeeds" without a log entry
// (or vice versa) would defeat the point of an audit trail.
//
// listActivityLog is the read side — Administrator-only viewer screen
// (§6, CD-D3-23), and now also the /api/v1/activity-log mobile endpoint.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export interface ActivityLogListParams {
  page: number;
  pageSize: number;
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ActivityLogListItem {
  id: string;
  actorId: string;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
}

export interface ActivityLogListResult {
  rows: ActivityLogListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listActivityLog(
  orgId: string,
  params: ActivityLogListParams
): Promise<ActivityLogListResult> {
  const where: Prisma.ActivityLogWhereInput = {
    org_id: orgId,
    ...(params.entity ? { entity: params.entity } : {}),
    ...(params.entityId ? { entityId: params.entityId } : {}),
    ...(params.actorId ? { actorId: params.actorId } : {}),
    ...(params.action ? { action: params.action } : {}),
    ...(params.dateFrom || params.dateTo
      ? {
          createdAt: {
            ...(params.dateFrom ? { gte: params.dateFrom } : {}),
            ...(params.dateTo ? { lte: params.dateTo } : {}),
          },
        }
      : {}),
  };

  const skip = (params.page - 1) * params.pageSize;

  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: params.pageSize,
      select: {
        id: true,
        actorId: true,
        action: true,
        entity: true,
        entityId: true,
        before: true,
        after: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorName: row.actor.name,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      before: row.before,
      after: row.after,
      createdAt: row.createdAt,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}
