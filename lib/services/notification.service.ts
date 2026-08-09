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

// Full set per prisma/schema.prisma:447 — only BOOKING_RECEIVED and
// DOCUMENT_UPLOADED are actually emitted today; SHIPPED/NAME_CHANGE_DEADLINE
// are wired to nothing yet (they need a cron that doesn't exist), kept here
// so this type doesn't have to change when that lands later.
export type NotificationEvent =
  | "BOOKING_RECEIVED"
  | "SHIPPED"
  | "NAME_CHANGE_DEADLINE"
  | "DOCUMENT_UPLOADED";

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
  createdAt: Date;
}

export async function listNotifications(
  orgId: string,
  userId: string,
  limit = 50
): Promise<NotificationListItem[]> {
  return prisma.notification.findMany({
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
