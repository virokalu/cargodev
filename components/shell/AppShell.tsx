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
        <main className="flex-1 overflow-auto bg-background p-3">
          {children}
        </main>
      </div>
    </div>
  );
}
