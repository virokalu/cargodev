"use server";

// Thin Server Actions for the notifications slice — same shape as
// vehicles/actions.ts: check the session, call a service, nothing else.

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/auth-guard";
import * as notificationService from "@/lib/services/notification.service";
import type { NotificationListResult } from "@/lib/services/notification.service";

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await requireUser();
  await notificationService.markRead(user.orgId, user.id, id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await notificationService.markAllRead(user.orgId, user.id);
  revalidatePath("/notifications");
}

/** "Load More" on the Notifications page — a pure read, called directly
 * from the client component (components/notifications/notification-list.tsx)
 * for the page after whatever's currently loaded. No revalidatePath: this
 * doesn't change any data, so there's nothing to invalidate. */
export async function loadMoreNotificationsAction(page: number): Promise<NotificationListResult> {
  const user = await requireUser();
  return notificationService.listNotificationsPaginated(user.orgId, user.id, {
    page,
    pageSize: notificationService.NOTIFICATIONS_PAGE_SIZE,
  });
}
