"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell, LogOut, User, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import type { StaffRole } from "@prisma/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPusherClient, userChannelName } from "@/lib/pusher-client";

interface HeaderProps {
  onMenuOpen: () => void;
  userId: string;
  userName: string;
  userRole: StaffRole;
  /** From the dashboard layout's server-side count — Header only tracks live
   * increments on top of this; a full resync happens whenever the layout
   * re-renders with a fresh value (e.g. after router.refresh() following a
   * mark-read action on the notifications page). */
  initialUnreadCount: number;
}

/** Derive up to 2 uppercase initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleBadgeLabel(role: StaffRole): string {
  const map: Record<StaffRole, string> = {
    ADMINISTRATOR: "Admin",
    MANAGER: "Manager",
    OPERATOR: "Operator",
    VIEWER: "Viewer",
  };
  return map[role];
}

export default function Header({
  onMenuOpen,
  userId,
  userName,
  userRole,
  initialUnreadCount,
}: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isNavigatingToProfile, startProfileNavigation] = useTransition();
  const [notificationCount, setNotificationCount] = useState(initialUnreadCount);
  // Adjust-during-render resync (react.dev "Adjusting state when a prop
  // changes") rather than a useEffect — avoids the extra render pass and
  // the "setState synchronously in an effect" lint error. Fires whenever the
  // server-provided count changes, e.g. after router.refresh() following a
  // mark-read/mark-all-read action on the notifications page. Live
  // increments between resyncs come from the Pusher effect below.
  const [syncedUnreadCount, setSyncedUnreadCount] = useState(initialUnreadCount);
  if (initialUnreadCount !== syncedUnreadCount) {
    setSyncedUnreadCount(initialUnreadCount);
    setNotificationCount(initialUnreadCount);
  }

  // Close the user menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Real-time badge — no-ops quietly if Pusher isn't configured
  // (getPusherClient() returns null, see lib/pusher-client.ts).
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(userChannelName(userId));
    const handleNewNotification = () => setNotificationCount((count) => count + 1);
    channel.bind("notification", handleNewNotification);

    return () => {
      channel.unbind("notification", handleNewNotification);
      pusher.unsubscribe(userChannelName(userId));
    };
  }, [userId]);

  const initials = getInitials(userName);

  return (
    <header className="h-14 flex items-center gap-4 px-4 bg-background border-b border-border flex-shrink-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuOpen}
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        {/* Notification bell */}
        <button
          onClick={() => router.push("/notifications")}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-background" />
          )}
        </button>

        {/* User avatar + dropdown */}
        <div className="relative ml-1" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((p) => !p)}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold select-none">
              {isNavigatingToProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                initials
              )}
            </div>
            <span className="hidden md:block text-sm font-medium text-foreground max-w-[120px] truncate">
              {userName}
            </span>
          </button>

          {/* Dropdown menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-popover rounded-xl shadow-lg border border-border py-1 z-50">
              {/* User info header */}
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold text-popover-foreground truncate">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground">{roleBadgeLabel(userRole)}</p>
              </div>

              {/* Menu items */}
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors text-left"
                onClick={() => {
                  setUserMenuOpen(false);
                  startProfileNavigation(() => router.push("/settings"));
                }}
              >
                <User className="w-4 h-4 text-muted-foreground" />
                My Profile
              </button>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
