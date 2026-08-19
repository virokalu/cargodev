"use client";

// Pins the title/export-buttons/tabs/tiles/filter-bar block to the top of
// the dashboard's scrolling <main> (components/shell/AppShell.tsx) while
// the group card list scrolls underneath it — same idea as a sticky table
// header, just for the whole "everything above the search bar" block
// rather than one row. bg-background keeps scrolled-up cards from showing
// through while this is pinned.
//
// Only sticky from sm: up. Below that, the tiles grid and filter row stack
// to one column each (see the *-report-panel.tsx files), so this whole
// block gets taller than a phone's viewport — pinned, it would permanently
// cover the screen and leave no room for any card to actually show. Plain
// static positioning on mobile means it scrolls away normally instead.

import type { ReactNode } from "react";

export function ReportStickyHeader({ children }: { children: ReactNode }) {
  return <div className="space-y-6 bg-background sm:sticky sm:top-0 sm:z-10">{children}</div>;
}
