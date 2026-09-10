"use client";

// Notifications list (US-37) — newest first, mark one/all read, click-
// through to the linked vehicle, "Load More" pagination (one
// NOTIFICATIONS_PAGE_SIZE-sized page per click, via loadMoreNotificationsAction).
//
// Real-time: a live Pusher event re-fetches just page 1 and merges in
// whatever's not already loaded (by id), rather than fabricating a row
// client-side — emit() bulk-inserts via createMany, so the created rows'
// ids never come back to the server-side trigger call, and an id is
// required both to mark a row read and to dedupe here. Merging (not
// replacing) the list is what keeps this safe to do without collapsing
// whatever pages the user has already loaded via "Load More".
//
// Mark-read/mark-all-read update local state optimistically (instant
// feedback, and — importantly — this is what avoids touching the
// accumulated "Load More" list at all) but still call router.refresh()
// afterwards, purely so the sidebar Header's unread badge
// (app/(dashboard)/layout.tsx's countUnread, a separate Server Component
// subtree) picks up the change — Header only listens for its own Pusher
// "increment" event, it has no "decrement on read" logic of its own. That
// refresh passes a new `initialResult` prop down here too, but this
// component only ever reads `initialResult` once, as the seed for
// useState — it deliberately does NOT resync state from later prop
// changes, or every Header-sync refresh would silently reset whatever
// pages the user had already loaded back down to just page 1.

import { useEffect, useState, useTransition } from "react";
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
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { getPusherClient, userChannelName } from "@/lib/pusher-client";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  loadMoreNotificationsAction,
} from "@/app/(dashboard)/notifications/actions";
import type { NotificationListItem, NotificationListResult } from "@/lib/services/notification.service";

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
  initialResult: NotificationListResult;
}

export function NotificationList({ userId, initialResult }: NotificationListProps) {
  const router = useRouter();
  // Seeded once from the server-rendered first page — deliberately not kept
  // in sync with the `initialResult` prop after mount, see header comment.
  const [notifications, setNotifications] = useState<NotificationListItem[]>(initialResult.rows);
  const [page, setPage] = useState(initialResult.page);
  const [totalPages, setTotalPages] = useState(initialResult.totalPages);
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasMore = page < totalPages;

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(userChannelName(userId));
    const handleNewNotification = () => {
      startTransition(async () => {
        const fresh = await loadMoreNotificationsAction(1);
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newOnes = fresh.rows.filter((n) => !existingIds.has(n.id));
          return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
        });
        // Total pages can only have grown (new rows, same pageSize) — safe
        // to trust the fresh value even though `page` (how many pages this
        // client has loaded) doesn't change here.
        setTotalPages(fresh.totalPages);
      });
    };
    channel.bind("notification", handleNewNotification);

    return () => {
      channel.unbind("notification", handleNewNotification);
      pusher.unsubscribe(userChannelName(userId));
    };
  }, [userId]);

  function handleRowClick(notification: NotificationListItem) {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      markNotificationReadAction(notification.id)
        .then(() => router.refresh())
        .catch((e) => console.error("Failed to persist notification read state", e));
    }
    if (notification.vehicleSerial) {
      router.push(`/vehicles/${notification.vehicleSerial}`);
    }
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllNotificationsReadAction()
      .then(() => router.refresh())
      .catch((e) => console.error("Failed to persist mark-all-read", e));
  }

  function handleLoadMore() {
    startTransition(async () => {
      const next = await loadMoreNotificationsAction(page + 1);
      setNotifications((prev) => [...prev, ...next.rows]);
      setPage(next.page);
      setTotalPages(next.totalPages);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" disabled={unreadCount === 0} onClick={handleMarkAllRead}>
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="size-4" />
          Nothing yet.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            {notifications.map((notification) => {
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

          {hasMore && (
            <div className="flex justify-center pt-1">
              <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
                {isPending ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
