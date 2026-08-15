// Notifications — in-app fan-out core. emit() writes Notification rows inside
// the caller's transaction (same reasoning as activity-log.service.ts's
// record(): a mutation that "succeeds" without its notification, or vice
// versa, would leave staff unaware of things that actually happened).
// Real-time push happens separately, after the transaction has committed —
// Pusher is an external network call and has no place inside a DB
// transaction, same reasoning file.service.ts already uses for R2 cleanup
// (best-effort, called right after the transaction resolves, never blocks
// the user-visible action).

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { triggerUserEvent } from "@/lib/pusher-server";

type TxClient = Prisma.TransactionClient;

// Full set per prisma/schema.prisma:447. `event` is deliberately a plain
// String column, not a Prisma enum — new values here never need a migration.
//
// Event-driven (fired synchronously from vehicle.service.ts mutations):
//   BOOKING_RECEIVED, SHIPMENT_REVERTED_TO_PENDING, SHIPPED,
//   VEHICLE_PURCHASED, AUCTION_BILL_PAID, DOCUMENT_UPLOADED
// Cron-driven (lib/services/reminder.service.ts, app/api/cron/daily-vehicle-
// checks): PAYMENT_REMINDER, RIKSO_REMINDER, LC_REMINDER, ETD_APPROACHING,
// MISSING_DOCUMENTS
// Reserved, not emitted by anything yet: NAME_CHANGE_DEADLINE
export type NotificationEvent =
  | "BOOKING_RECEIVED"
  | "SHIPMENT_REVERTED_TO_PENDING"
  | "SHIPPED"
  | "NAME_CHANGE_DEADLINE"
  | "DOCUMENT_UPLOADED"
  | "VEHICLE_PURCHASED"
  | "AUCTION_BILL_PAID"
  | "PAYMENT_REMINDER"
  | "RIKSO_REMINDER"
  | "LC_REMINDER"
  | "ETD_APPROACHING"
  | "MISSING_DOCUMENTS";

export interface EmitParams {
  orgId: string;
  event: NotificationEvent;
  title: string;
  body: string;
  vehicleId?: string;
  recipientUserIds: string[];
}

/** Admin/Manager staff in the org, minus whoever caused the event (no point
 * notifying someone about their own action). loginEnabled filters out
 * deactivated accounts, same guard used everywhere else staff are listed. */
export async function listNotifiableStaffIds(
  tx: TxClient,
  orgId: string,
  excludeUserId?: string
): Promise<string[]> {
  const staff = await tx.user.findMany({
    where: {
      org_id: orgId,
      userType: "STAFF",
      role: { in: ["ADMINISTRATOR", "MANAGER"] },
      loginEnabled: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return staff.map((u) => u.id);
}

/** Writes one Notification row per recipient, inside the caller's
 * transaction. No-ops if there are no recipients. Call notifyRealtime with
 * the same params once the transaction has actually committed. */
export async function emit(tx: TxClient, params: EmitParams): Promise<void> {
  if (params.recipientUserIds.length === 0) return;
  await tx.notification.createMany({
    data: params.recipientUserIds.map((userId) => ({
      org_id: params.orgId,
      userId,
      event: params.event,
      title: params.title,
      body: params.body,
      vehicleId: params.vehicleId ?? null,
    })),
  });
}

/** Post-commit, best-effort real-time push — never awaited by callers, never
 * throws into the request path. The notification is already durably saved
 * by emit() regardless of whether this succeeds; a push failure (or Pusher
 * being unconfigured) just means the recipient sees it on next refresh
 * instead of live. */
export function notifyRealtime(params: EmitParams): void {
  for (const userId of params.recipientUserIds) {
    triggerUserEvent(userId, "notification", {
      event: params.event,
      title: params.title,
      body: params.body,
      vehicleId: params.vehicleId ?? null,
    }).catch((e) => console.error("Pusher trigger failed", e));
  }
}

export interface NotificationListItem {
  id: string;
  event: string;
  title: string;
  body: string;
  isRead: boolean;
  vehicleId: string | null;
  // The read-only detail page is routed by serial, not id (/vehicles/[serial])
  // — resolved here, not via a Prisma relation, since Notification.vehicleId
  // has none (same reasoning/shape as vehicle.service.ts's
  // listVehicleStatusHistory resolving StatusHistory.triggeredBy to a name).
  // Null when there's no linked vehicle, or it's since been deleted.
  vehicleSerial: string | null;
  createdAt: Date;
}

export async function listNotifications(
  orgId: string,
  userId: string,
  limit = 50
): Promise<NotificationListItem[]> {
  const rows = await prisma.notification.findMany({
    where: { org_id: orgId, userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      event: true,
      title: true,
      body: true,
      isRead: true,
      vehicleId: true,
      createdAt: true,
    },
  });

  const vehicleIds = [...new Set(rows.map((r) => r.vehicleId).filter((id): id is string => id !== null))];
  const vehicles = vehicleIds.length
    ? await prisma.vehicle.findMany({ where: { id: { in: vehicleIds } }, select: { id: true, serial: true } })
    : [];
  const serialById = new Map(vehicles.map((v) => [v.id, v.serial]));

  return rows.map((row) => ({
    ...row,
    vehicleSerial: row.vehicleId ? (serialById.get(row.vehicleId) ?? null) : null,
  }));
}

export async function countUnread(orgId: string, userId: string): Promise<number> {
  return prisma.notification.count({ where: { org_id: orgId, userId, isRead: false } });
}

/** Compound where (id + org_id + userId) enforces ownership without a
 * separate fetch-then-check round trip — an id that doesn't belong to this
 * user/org just updates zero rows, same as marking an already-read
 * notification read again. Idempotent either way, so there's nothing to
 * throw on. */
export async function markRead(orgId: string, userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, org_id: orgId, userId },
    data: { isRead: true },
  });
}

export async function markAllRead(orgId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { org_id: orgId, userId, isRead: false },
    data: { isRead: true },
  });
}
