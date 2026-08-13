"use client";

// The vehicles table's identity pane (Serial No / Chassis No / Model & Grade
// / Actions) and detail pane (~28 more columns) are two separate <table>s —
// see vehicles-table.tsx's top comment for why. To get a working sticky
// header on each (position: sticky needs a wrapper that actually scrolls —
// see the WHY note on PANE_SCROLL_CLASS below), each pane's own scroll
// wrapper now gets a bounded height + real vertical scrolling, which means
// the two panes are no longer implicitly kept in vertical lockstep by plain
// page-level scroll like they used to be. This mirrors scrollTop between
// them so a vehicle's row stays aligned across both panes.

import { createContext, useCallback, useContext, useRef } from "react";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// WHY a bounded height is required at all: each pane's scroll wrapper
// (components/ui/table.tsx) has `overflow-x-auto` for its own independent
// horizontal scroll. Per the CSS overflow spec, a non-visible overflow-x
// forces the computed overflow-y to become `auto` too — so that div is
// already a "scroll container" today, but with an unbounded (auto) height it
// never actually scrolls vertically, which means `position: sticky` bound to
// it (the nearest scroll-container ancestor, regardless of what actually
// scrolls) stays inert. Giving it a real max-height + overflow-y-auto makes
// it the genuine scrollport a sticky header can pin to. Must be a static
// string (not built from a shared constant) — Tailwind only picks up
// arbitrary-value classes it can find as literal text — and both panes must
// use the exact same value so their scrollTop values map 1:1 without scaling.
export const PANE_SCROLL_CLASS = "max-h-[65vh] overflow-y-auto";

type Pane = "identity" | "detail";

interface VerticalScrollSync {
  identityRef: React.RefObject<HTMLDivElement | null>;
  detailRef: React.RefObject<HTMLDivElement | null>;
  isSyncingRef: React.RefObject<boolean>;
}

const VerticalScrollSyncContext = createContext<VerticalScrollSync | null>(null);

export function VerticalScrollSyncProvider({ children }: { children: React.ReactNode }) {
  const identityRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  return (
    <VerticalScrollSyncContext.Provider value={{ identityRef, detailRef, isSyncingRef }}>
      {children}
    </VerticalScrollSyncContext.Provider>
  );
}

/** Ref + onScroll for one pane's scroll wrapper — copies its scrollTop onto
 * the other pane. Guarded by isSyncingRef so setting the other pane's
 * scrollTop (which fires its own scroll event) doesn't ping-pong back. */
export function useVerticalScrollSync(pane: Pane) {
  const ctx = useContext(VerticalScrollSyncContext);
  if (!ctx) throw new Error("useVerticalScrollSync must be used within VerticalScrollSyncProvider");
  const { identityRef, detailRef, isSyncingRef } = ctx;
  const ownRef = pane === "identity" ? identityRef : detailRef;
  const otherRef = pane === "identity" ? detailRef : identityRef;

  const onScroll = useCallback<React.UIEventHandler<HTMLDivElement>>(
    (event) => {
      if (isSyncingRef.current) return;
      const other = otherRef.current;
      if (!other) return;
      isSyncingRef.current = true;
      other.scrollTop = event.currentTarget.scrollTop;
      isSyncingRef.current = false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pane]
  );

  return { ref: ownRef, onScroll };
}

/** The identity pane's table — same idea as DetailPaneTable
 * (status-scroll-context.tsx), just without the horizontal status-dot
 * concern this pane never had. `no-scrollbar` hides this pane's own
 * scrollbar (it stays scrollable via the sync above, just not visibly) so
 * only ONE vertical scrollbar shows, on the detail pane — two side-by-side
 * scrollbars made the synced panes read as two separate tables rather than
 * one, even though their content was already moving together. */
export function IdentityPaneTable({ children }: { children: React.ReactNode }) {
  const { ref, onScroll } = useVerticalScrollSync("identity");
  return (
    <Table ref={ref} containerClassName={cn(PANE_SCROLL_CLASS, "no-scrollbar")} onScroll={onScroll}>
      {children}
    </Table>
  );
}
