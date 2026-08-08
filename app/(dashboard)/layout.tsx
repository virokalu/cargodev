import { requireUser } from "@/lib/services/auth-guard";
import AppShell from "@/components/shell/AppShell";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { countUnread } from "@/lib/services/notification.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login if no valid session.
  const user = await requireUser();
  // Initial count for first paint — Header subscribes to Pusher for live
  // updates after that, but the very first render (and any hard navigation)
  // has no socket yet, so this still needs to be right on its own.
  const unreadCount = await countUnread(user.orgId, user.id);

  return (
    <AuthSessionProvider>
      <AppShell user={{ id: user.id, name: user.name ?? "User", role: user.role }} unreadCount={unreadCount}>
        {children}
      </AppShell>
    </AuthSessionProvider>
  );
}
