"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  CirclePlus,
  Bell,
  BarChart3,
  Users,
  UserRound,
  Settings,
  Truck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Vehicles", href: "/vehicles", icon: Car },
  { label: "Add Vehicle", href: "/vehicles/add", icon: CirclePlus },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
  { label: "Customers", href: "/customers", icon: UserRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  /** Mobile: whether the sidebar overlay is open */
  isOpen: boolean;
  /** Mobile: close the sidebar overlay */
  onClose: () => void;
  /** Desktop: whether the sidebar is collapsed to icon-only mode */
  collapsed: boolean;
  /** Desktop: toggle collapsed state */
  onToggleCollapse: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-white/10",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
          <Truck className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight">CargoDev</p>
            <p className="text-[10px] text-slate-400 leading-tight truncate">
              Vehicle Management
            </p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          // Active detection: exact match for root routes, prefix match for nested
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.08]"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="px-2 pb-4 hidden md:block">
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors",
            collapsed && "justify-center px-2"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — fixed left */}
      <aside
        className={cn(
          "hidden md:flex flex-col flex-shrink-0 bg-sidebar transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Slide-in panel */}
          <aside className="relative w-64 flex flex-col bg-sidebar">
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
