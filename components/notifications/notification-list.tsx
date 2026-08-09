"use client";

// Notifications list (US-37) — newest first, mark one/all read, click-through
// to the linked vehicle. Real-time: a live Pusher event just triggers a
// router.refresh() rather than fabricating a row client-side — emit() bulk-
// inserts via createMany, so the created rows' ids never come back to the
// server-side trigger call, and a notification's id is required to mark it
// read. A refresh is simple, correct, and near-instant either way.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Ship, FileText, AlertTriangle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { getPusherClient, userChannelName } from "@/lib/pusher-client";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/(dashboard)/notifications/actions";
import type { NotificationListItem } from "@/lib/services/notification.service";

const EVENT_ICON: Record<string, typeof Bell> = {
  BOOKING_RECEIVED: Ship,
  SHIPPED: Ship,
  NAME_CHANGE_DEADLINE: AlertTriangle,
  DOCUMENT_UPLOADED: FileText,
};

interface NotificationListProps {
  userId: string;
  initialNotifications: NotificationListItem[];
}

export function NotificationList({ userId, initialNotifications }: NotificationListProps) {
  const router = useRouter();
  const unreadCount = initialNotifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(userChannelName(userId));
    const handleNewNotification = () => router.refresh();
    channel.bind("notification", handleNewNotification);

    return () => {
      channel.unbind("notification", handleNewNotification);
      pusher.unsubscribe(userChannelName(userId));
    };
  }, [userId, router]);

  async function handleRowClick(notification: NotificationListItem) {
    if (!notification.isRead) {
      await markNotificationReadAction(notification.id);
      router.refresh();
    }
    if (notification.vehicleId) {
      router.push(`/vehicles/${notification.vehicleId}/edit`);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" disabled={unreadCount === 0} onClick={handleMarkAllRead}>
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </div>

      {initialNotifications.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="size-4" />
          Nothing yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {initialNotifications.map((notification) => {
            const Icon = EVENT_ICON[notification.event] ?? Bell;
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleRowClick(notification)}
                className={`flex w-full items-start gap-3 rounded-md border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                  notification.isRead ? "" : "bg-accent/50"
                }`}
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{notification.title}</span>
                    {!notification.isRead && (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                    )}
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{notification.body}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(notification.createdAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
