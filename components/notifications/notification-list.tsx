"use client";

// Notifications list (US-37) — newest first, mark one/all read, click-through
// to the linked vehicle. Real-time: a live Pusher event just triggers a
// router.refresh() rather than fabricating a row client-side — emit() bulk-
// inserts via createMany, so the created rows' ids never come back to the
// server-side trigger call, and a notification's id is required to mark it
// read. A refresh is simple, correct, and near-instant either way.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Ship,
  FileText,
  FileWarning,
  AlertTriangle,
  CheckCheck,
  Car,
  Banknote,
  CircleDollarSign,
  Truck,
  Landmark,
  CalendarClock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { getPusherClient, userChannelName } from "@/lib/pusher-client";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/(dashboard)/notifications/actions";
import type { NotificationListItem } from "@/lib/services/notification.service";

// Priority/color is derived purely from the event type, same place the icon
// already comes from — no stored priority column, matching how every other
// derived-display concept in this app works (e.g. shipment-status badges).
type EventTone = "destructive" | "warning" | "info" | "success" | "secondary";

const EVENT_STYLE: Record<string, { icon: typeof Bell; tone: EventTone }> = {
  // Missing paperwork right before a shipment leaves — the one thing that
  // actually blocks something, so it's the only red/destructive tone.
  MISSING_DOCUMENTS: { icon: FileWarning, tone: "destructive" },
  // Outstanding follow-ups — nothing's blocked yet, but staff need to act.
  PAYMENT_REMINDER: { icon: CircleDollarSign, tone: "warning" },
  RIKSO_REMINDER: { icon: Truck, tone: "warning" },
  LC_REMINDER: { icon: Landmark, tone: "warning" },
  ETD_APPROACHING: { icon: CalendarClock, tone: "warning" },
  NAME_CHANGE_DEADLINE: { icon: AlertTriangle, tone: "warning" },
  // Informational lifecycle progress.
  BOOKING_RECEIVED: { icon: Ship, tone: "info" },
  SHIPMENT_REVERTED_TO_PENDING: { icon: RotateCcw, tone: "info" },
  // Good news / completed milestones.
  SHIPPED: { icon: Ship, tone: "success" },
  AUCTION_BILL_PAID: { icon: Banknote, tone: "success" },
  // Neutral, informational-only.
  VEHICLE_PURCHASED: { icon: Car, tone: "secondary" },
  DOCUMENT_UPLOADED: { icon: FileText, tone: "secondary" },
};

const TONE_CLASSES: Record<EventTone, { icon: string; bg: string }> = {
  destructive: { icon: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: "text-warning", bg: "bg-warning/10" },
  info: { icon: "text-info", bg: "bg-info/10" },
  success: { icon: "text-success", bg: "bg-success/10" },
  secondary: { icon: "text-muted-foreground", bg: "bg-muted" },
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
    if (notification.vehicleSerial) {
      router.push(`/vehicles/${notification.vehicleSerial}`);
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
            const style = EVENT_STYLE[notification.event];
            const Icon = style?.icon ?? Bell;
            const tone = TONE_CLASSES[style?.tone ?? "secondary"];
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleRowClick(notification)}
                className={`flex w-full items-start gap-3 rounded-md border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                  notification.isRead ? "" : "bg-accent/50"
                }`}
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone.bg)}>
                  <Icon className={cn("size-4", tone.icon)} />
                </span>
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
