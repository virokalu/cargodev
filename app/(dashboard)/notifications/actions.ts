"use server";

// Thin Server Actions for the notifications slice — same shape as
// vehicles/actions.ts: check the session, call a service, nothing else.

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/auth-guard";
import * as notificationService from "@/lib/services/notification.service";

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
