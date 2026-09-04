"use client";

// The vehicle table's identity columns (Serial No / Chassis No / Model &
// Grade / Actions) and the ~28 detail columns render as two separate
// <table>s in two independently horizontally-scrolling panes (see
// vehicles-table.tsx). Once a row's Shipment Status badge — the first
// column in the detail pane — has scrolled out of view, there's no visual
// reminder of that row's status until you scroll back. This tracks the
// detail pane's scroll position and exposes it via context, so a small dot
// in the (always-visible) Actions column of the *other* pane can "arrive" —
// scaling and fading in — once the real badge is gone, standing in for it
// until you scroll back. Provider and the scroll-tracked table are split
// apart (rather than one component owning both, like before) because the
// dot and the scrolling element now live in different DOM subtrees.

import { createContext, useContext, useState, useCallback } from "react";
import { Table } from "@/components/ui/table";
import { PANE_SCROLL_CLASS, useVerticalScrollSync } from "@/components/vehicles/vertical-scroll-context";
import { cn } from "@/lib/utils";
import { SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants/shipment-status";

interface StatusScrollState {
  visible: boolean;
  onScroll: React.UIEventHandler<HTMLDivElement>;
}

const StatusScrollContext = createContext<StatusScrollState>({
  visible: false,
  onScroll: () => {},
});

// Roughly the width of the Shipment Status badge + cell padding — the first
// column in the detail pane. Doesn't need to be pixel-exact: the dot
// arriving a little before/after the badge fully disappears still reads as
// "following" it, which is the actual goal here.
const SCROLL_THRESHOLD = 80;

export function StatusScrollProvider({ children }: { children: React.ReactNode }) {
  const [pastThreshold, setPastThreshold] = useState(false);
  const onScroll = useCallback<React.UIEventHandler<HTMLDivElement>>((e) => {
    setPastThreshold(e.currentTarget.scrollLeft > SCROLL_THRESHOLD);
  }, []);

  return (
    <StatusScrollContext.Provider value={{ visible: pastThreshold, onScroll }}>
      {children}
    </StatusScrollContext.Provider>
  );
}

/** The detail pane's table — reports its own scroll position up to the
 * provider so the dot in the identity pane knows when to appear, and (via
 * useVerticalScrollSync) keeps its vertical scroll in lockstep with the
 * identity pane now that each pane scrolls vertically on its own — see
 * vertical-scroll-context.tsx for why that's now necessary. */
export function DetailPaneTable({ children }: { children: React.ReactNode }) {
  const { onScroll: statusOnScroll } = useContext(StatusScrollContext);
  const { ref, onScroll: verticalOnScroll } = useVerticalScrollSync("detail");
  return (
    <Table
      ref={ref}
      containerClassName={PANE_SCROLL_CLASS}
      onScroll={(event) => {
        statusOnScroll(event);
        verticalOnScroll(event);
      }}
    >
      {children}
    </Table>
  );
}

const DOT_COLOR: Record<"warning" | "info" | "success" | "destructive", string> = {
  warning: "bg-warning",
  info: "bg-info",
  success: "bg-success",
  destructive: "bg-destructive",
};

/** Lives in the Actions cell of every row — status colour, scaled to zero
 * and invisible until the real badge scrolls out of view, then jumps in. */
export function StatusScrollDot({ status }: { status: ShipmentStatus }) {
  const { visible } = useContext(StatusScrollContext);
  const meta = SHIPMENT_STATUS_META[status];

  return (
    <span
      aria-hidden="true"
      title={meta.label}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        DOT_COLOR[meta.badgeVariant],
        visible ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}
    />
  );
}
