// Server Component — auth guard (requireUser) will be added in CD-D3-18
import AppShell from "@/components/shell/AppShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
