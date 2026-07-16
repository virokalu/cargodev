"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AuthChannelListener from "@/components/auth/AuthChannelListener";
import type { StaffRole } from "@prisma/client";

interface AppShellUser {
  name: string;
  role: StaffRole;
}

interface AppShellProps {
  children: React.ReactNode;
  user: AppShellUser;
}

export default function AppShell({ children, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <AuthChannelListener />
      <div className="flex h-full">
        <Sidebar
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <Header
            onMenuOpen={() => setMobileOpen(true)}
            userName={user.name}
            userRole={user.role}
          />
          <main className="flex-1 overflow-auto bg-background p-3">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
