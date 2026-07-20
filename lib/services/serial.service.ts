// Serial number engine (Tech Doc §3).
//
// Two ways a vehicle gets a serial:
//   1. Normal entry: transactionally increment the org+prefix counter and
//      assign the next number. Two staff saving at the same instant can never
//      get the same serial because the increment happens inside the same
//      Prisma transaction as the vehicle insert (see vehicle.service.ts) —
//      the row lock on SerialCounter serializes concurrent saves.
//   2. Legacy entry: staff types the original serial from the old sheets.
//      If it's higher than the counter, the counter bumps up to match so the
//      next *new* serial continues correctly; if lower, it just back-fills
//      without touching the counter.
//
// All functions take `tx` (a Prisma transaction client) — callers are
// responsible for wrapping the counter update and the vehicle insert in the
// same $transaction so the two never disagree.

import type { Prisma, SerialPrefix } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";

type TxClient = Prisma.TransactionClient;

export interface AssignedSerial {
  serialNumber: number;
  serial: string;
}

/** Normal entry: atomically increment the counter and assign the next number. */
export async function assignNextSerial(
  tx: TxClient,
  orgId: string,
  prefix: SerialPrefix
): Promise<AssignedSerial> {
  const counter = await tx.serialCounter.update({
    where: { org_id_prefix: { org_id: orgId, prefix } },
    data: { lastNumber: { increment: 1 } },
  });

  return { serialNumber: counter.lastNumber, serial: `${prefix}${counter.lastNumber}` };
}

/**
 * Legacy entry: validate the manually typed number is unique, then bump the
 * counter up if needed (never down — a lower legacy number just back-fills a
 * gap without affecting what the next auto-assigned serial will be).
 */
export async function assignLegacySerial(
  tx: TxClient,
  orgId: string,
  prefix: SerialPrefix,
  manualNumber: number
): Promise<AssignedSerial> {
  const serial = `${prefix}${manualNumber}`;

  const existing = await tx.vehicle.findUnique({
    where: { org_id_serial: { org_id: orgId, serial } },
    select: { id: true },
  });
  if (existing) {
    throw new ServiceError(
      "CONFLICT",
      `Serial ${serial} already exists.`,
      { legacySerialNumber: `Serial ${serial} already exists.` }
    );
  }

  const counter = await tx.serialCounter.findUniqueOrThrow({
    where: { org_id_prefix: { org_id: orgId, prefix } },
  });

  if (manualNumber > counter.lastNumber) {
    await tx.serialCounter.update({
      where: { org_id_prefix: { org_id: orgId, prefix } },
      data: { lastNumber: manualNumber },
    });
  }

  return { serialNumber: manualNumber, serial };
}

/** Read-only preview of the next auto-assigned serial — no increment. Used by
 * the Add Vehicle form to show "Next serial: FC1024" as staff pick a track.
 * Staleness is acceptable: the real assignment at save time is still
 * transactional and can never collide, this is just a hint. */
export async function previewNextSerial(
  orgId: string,
  prefix: SerialPrefix
): Promise<string> {
  const counter = await prisma.serialCounter.findUnique({
    where: { org_id_prefix: { org_id: orgId, prefix } },
  });
  const nextNumber = (counter?.lastNumber ?? 0) + 1;
  return `${prefix}${nextNumber}`;
}
