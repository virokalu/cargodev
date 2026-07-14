"use client";

import { Menu, Search, Bell, Moon, Sun } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  /** Called when the hamburger is pressed on mobile */
  onMenuOpen: () => void;
}

export default function Header({ onMenuOpen }: HeaderProps) {
  // Placeholder dark mode toggle state — real theme switching comes in a later task
  const [darkMode, setDarkMode] = useState(false);

  // Placeholder notification count — will be driven by real data later
  const notificationCount = 3;

  return (
    <header className="h-14 flex items-center gap-4 px-4 bg-white border-b border-slate-200 flex-shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Hamburger — visible on mobile only */}
        <button
          onClick={onMenuOpen}
          className="md:hidden text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search — visible on desktop only */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-72">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search vehicles, customers…"
            className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none w-full"
          />
        </div>
      </div>

      {/* Right side icons */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle — UI only for now */}
        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification bell with badge */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label={`Notifications (${notificationCount} unread)`}
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />
          )}
        </button>

        {/* User avatar with initials — placeholder until auth is wired */}
        <div
          className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold select-none cursor-pointer"
          aria-label="User menu"
        >
          GM
        </div>
      </div>
    </header>
  );
}
