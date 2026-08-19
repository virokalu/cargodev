"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import type { StaffRole } from "@prisma/client";

interface AppShellUser {
  id: string;
  name: string;
  role: StaffRole;
}

interface AppShellProps {
  children: React.ReactNode;
  user: AppShellUser;
  unreadCount: number;
}

export default function AppShell({ children, user, unreadCount }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        role={user.role}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          onMenuOpen={() => setMobileOpen(true)}
          userId={user.id}
          userName={user.name}
          userRole={user.role}
          initialUnreadCount={unreadCount}
        />
        {/* [overflow-anchor:none]: Chrome's scroll anchoring tries to keep your
            scroll position visually stable by silently adjusting scrollTop
            whenever content above the viewport changes height — e.g. Reports'
            title/export-buttons row (report-header.tsx) wraps between one line
            and two lines purely based on available width, so at some window
            widths its height is unstable as things resize. Combined with a
            sticky block below it, the browser can anchor to the wrong card in
            a scrolled list and briefly render it in the wrong place. Nothing
            here depends on that browser behavior (no content ever prepends
            above what you're reading), so it's off for the whole dashboard
            rather than chasing this per page. */}
        <main className="flex-1 overflow-auto bg-background p-3 [overflow-anchor:none]">
          {children}
        </main>
      </div>
    </div>
  );
}
