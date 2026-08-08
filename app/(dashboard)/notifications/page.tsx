import { requireUser } from "@/lib/services/auth-guard";
import { listNotifications } from "@/lib/services/notification.service";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await listNotifications(user.orgId, user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your alerts and updates.</p>
      </div>
      <NotificationList userId={user.id} initialNotifications={notifications} />
    </div>
  );
}
