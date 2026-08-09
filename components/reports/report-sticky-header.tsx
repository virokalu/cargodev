"use client";

// Pins the title/export-buttons/tabs/tiles/filter-bar block to the top of
// the dashboard's scrolling <main> (components/shell/AppShell.tsx) while
// the group card list scrolls underneath it — same idea as a sticky table
// header, just for the whole "everything above the search bar" block
// rather than one row. bg-background keeps scrolled-up cards from showing
// through while this is pinned.

import type { ReactNode } from "react";

export function ReportStickyHeader({ children }: { children: ReactNode }) {
  return <div className="sticky top-0 z-10 space-y-6 bg-background">{children}</div>;
}
