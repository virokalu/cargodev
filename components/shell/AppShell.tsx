"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  // Mobile: controls whether the sidebar overlay is open
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop: controls whether the sidebar is collapsed to icon-only mode
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full">
      {/* Sidebar: fixed on desktop, overlay on mobile */}
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      {/* Main content area: header + scrollable page content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
