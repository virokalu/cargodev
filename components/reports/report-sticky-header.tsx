"use client";

// The title/export-buttons/tabs/tiles/filter-bar block that sits above the
// group card list in every Reports panel (see each *-report-panel.tsx,
// which wraps this in a flex column and gives the card list below it its
// own `overflow-y-auto` region — grep "min-h-0 flex-1 overflow-y-auto").
//
// Deliberately NOT position: sticky. An earlier version used sticky, with
// the card list scrolling in the same container underneath it — but a
// sticky element and the content scrolling past it still share one scroll
// container, and Chrome's scroll anchoring (which nudges scrollTop to keep
// your reading position stable whenever content above the viewport changes
// height) could occasionally mis-anchor to a card and briefly render it
// above this block during a resize/reflow. Giving the card list its own
// separate scroll box below this one — shrink-0 here, flex-1 overflow-y-auto
// there — makes that impossible instead of just unlikely: there's no longer
// any shared scroll position for a card to escape into.
//
// shrink-0 stops the flex-1 card list below it from squeezing this block
// when both are short enough to fit without scrolling.

import type { ReactNode } from "react";

export function ReportStickyHeader({ children }: { children: ReactNode }) {
  return <div className="shrink-0 space-y-6">{children}</div>;
}
