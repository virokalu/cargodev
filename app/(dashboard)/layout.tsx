import { requireUser } from "@/lib/services/auth-guard";
import AppShell from "@/components/shell/AppShell";
import { AuthSessionProvider } from "@/components/providers/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login if no valid session.
  const user = await requireUser();

  return (
    <AuthSessionProvider>
      <AppShell user={{ name: user.name ?? "User", role: user.role }}>
        {children}
      </AppShell>
    </AuthSessionProvider>
  );
}
