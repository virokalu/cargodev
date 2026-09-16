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

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
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
// overscroll-none kills the native "rubber-band" bounce/stretch at every
// edge of each pane's scrollport — top/bottom (vertical) and, since this
// same div also carries the base Table component's own `overflow-x-auto`
// for horizontal scroll, left/right too — and stops an exhausted scroll
// from chaining up to the outer page. Without it, scrolling past any edge
// visibly overshoots and springs back (extra blank space appearing past the
// last column, in the horizontal case), which reads as the table not
// staying put.
export const PANE_SCROLL_CLASS = "max-h-[65vh] overflow-y-auto overscroll-none";

type Pane = "identity" | "detail";

// Remembers each pane's scroll position (vertical + that pane's own
// horizontal) across an in-app navigation away from /vehicles and back —
// e.g. opening a vehicle's detail page, or switching to a different sidebar
// section, then coming back — and across switching the FC/FL track toggle
// and back, since that's a real URL change too (?track=). sessionStorage
// rather than a plain module variable so it also survives a full page
// reload within the same browser tab, and clears itself once the tab
// actually closes rather than leaking forever. Keyed by the full URL
// (path + query string) so different filters/sort/page/track combinations
// each remember their own scroll position instead of colliding.
function scrollStorageKey(pane: Pane): string {
  return `vehicles-table-scroll:${pane}:${window.location.pathname}${window.location.search}`;
}

interface StoredScroll {
  top: number;
  left: number;
}

function readStoredScroll(pane: Pane): StoredScroll | null {
  try {
    const raw = sessionStorage.getItem(scrollStorageKey(pane));
    return raw ? (JSON.parse(raw) as StoredScroll) : null;
  } catch {
    // Private-browsing / storage disabled — restoring is a nicety, never
    // block rendering over it.
    return null;
  }
}

function writeStoredScroll(pane: Pane, value: StoredScroll): void {
  try {
    sessionStorage.setItem(scrollStorageKey(pane), JSON.stringify(value));
  } catch {
    // Same as above — silently skip if storage isn't available.
  }
}

interface VerticalScrollSync {
  identityRef: React.RefObject<HTMLDivElement | null>;
  detailRef: React.RefObject<HTMLDivElement | null>;
  isSyncingRef: React.RefObject<boolean>;
  scrollTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
}

const VerticalScrollSyncContext = createContext<VerticalScrollSync | null>(null);

export function VerticalScrollSyncProvider({ children }: { children: React.ReactNode }) {
  const identityRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <VerticalScrollSyncContext.Provider value={{ identityRef, detailRef, isSyncingRef, scrollTimeoutRef }}>
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
  const { identityRef, detailRef, isSyncingRef, scrollTimeoutRef } = ctx;
  const ownRef = pane === "identity" ? identityRef : detailRef;
  const otherRef = pane === "identity" ? detailRef : identityRef;
  // Separate from scrollTimeoutRef above (shared across both panes, for the
  // CSS class) — this one is per-pane, so persisting pane A's position
  // can't get cancelled by pane B's sync-triggered scroll event resetting
  // a shared timer before pane A's debounce fires.
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore this pane's scroll position once, on mount — the rows are
  // already in the DOM by the time this runs (passed in as children, not
  // fetched client-side), so there's already enough scroll range to
  // restore into. Keeps the table where you left it after navigating away
  // (a vehicle's detail page, a different sidebar section) and back, or
  // switching the FC/FL track toggle and back.
  useEffect(() => {
    const el = ownRef.current;
    if (!el) return;
    const stored = readStoredScroll(pane);
    if (!stored) return;
    el.scrollTop = stored.top;
    el.scrollLeft = stored.left;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = useCallback<React.UIEventHandler<HTMLDivElement>>(
    (event) => {
      // Marks both panes as "actively scrolling" for the duration of this
      // gesture (plain classList, not React state — scroll fires far too
      // often to re-render on) so app/globals.css can suppress row hover.
      // Without this, rows sliding vertically under a stationary cursor
      // each fire a real mouseenter/mouseleave as they pass underneath,
      // producing a visible highlight "wave" animating down the table.
      identityRef.current?.classList.add("table-is-scrolling");
      detailRef.current?.classList.add("table-is-scrolling");
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        identityRef.current?.classList.remove("table-is-scrolling");
        detailRef.current?.classList.remove("table-is-scrolling");
      }, 150);

      // Remembers where this pane is scrolled to, debounced so a fast
      // scroll gesture doesn't hit sessionStorage on every frame. Reads
      // back off the ref (not event.currentTarget) once the debounce
      // fires, so it captures wherever the scroll actually settled.
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = setTimeout(() => {
        const el = ownRef.current;
        if (!el) return;
        writeStoredScroll(pane, { top: el.scrollTop, left: el.scrollLeft });
      }, 150);

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
