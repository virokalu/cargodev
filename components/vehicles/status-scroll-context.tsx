"use client";

// The vehicle table freezes Serial No / Chassis No / Model & Grade / Actions
// on the left; everything else — Shipment Status included — scrolls
// underneath. Once a row's status badge has scrolled out from under the
// frozen columns, there's no visual reminder of that row's status until you
// scroll back. This tracks the table's horizontal scroll position and
// exposes it via context, so a small dot in the (always-visible) Actions
// column can "arrive" — scaling and fading in — once the real badge is gone,
// standing in for it until you scroll back.
//
// The actual scrollable element lives inside <Table> (ui/table.tsx), not
// here — this wraps it (rather than duplicating the overflow-x-auto div)
// and reads scrollLeft off the onScroll event Table forwards.

import { createContext, useContext, useState } from "react";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants/shipment-status";

const StatusScrollContext = createContext(false);

function useStatusScrollVisible(): boolean {
  return useContext(StatusScrollContext);
}

// Roughly the width of the Shipment Status badge + cell padding — the first
// scrollable column, immediately after the frozen ones. Doesn't need to be
// pixel-exact: the dot arriving a little before/after the badge fully
// disappears still reads as "following" it, which is the actual goal here.
const SCROLL_THRESHOLD = 80;

export function VehicleTableScrollArea({ children }: { children: React.ReactNode }) {
  const [pastThreshold, setPastThreshold] = useState(false);

  return (
    <StatusScrollContext.Provider value={pastThreshold}>
      <Table onScroll={(e) => setPastThreshold(e.currentTarget.scrollLeft > SCROLL_THRESHOLD)}>
        {children}
      </Table>
    </StatusScrollContext.Provider>
  );
}

const DOT_COLOR: Record<"warning" | "info" | "success", string> = {
  warning: "bg-warning",
  info: "bg-info",
  success: "bg-success",
};

/** Lives in the Actions cell of every row — status colour, scaled to zero
 * and invisible until the real badge scrolls out of view, then jumps in. */
export function StatusScrollDot({ status }: { status: ShipmentStatus }) {
  const visible = useStatusScrollVisible();
  const meta = SHIPMENT_STATUS_META[status];

  return (
    <span
      aria-hidden="true"
      title={meta.label}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full transition-all duration-300 ease-out",
        DOT_COLOR[meta.badgeVariant],
        visible ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}
    />
  );
}
