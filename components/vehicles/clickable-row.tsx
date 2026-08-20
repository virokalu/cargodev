"use client";

// Mirrors the hovered vehicle id across the vehicles table's two panes,
// without turning the whole (deliberately server-rendered) table into a
// client component — same "isolate the one interactive bit into a small
// leaf" pattern as DetailPaneTable/StatusScrollProvider in
// status-scroll-context.tsx.
//
// The identity pane (Serial/Chassis/Model/Actions) and the detail pane
// (everything else) are two separate <table>s (see vehicles-table.tsx's
// top comment) so a vehicle's "one row" is actually two unrelated <tr>s in
// two unrelated tables — plain CSS :hover only lights up whichever table
// the pointer happens to be over. It's meant to read as a single row
// regardless, so RowHoverProvider mirrors the hovered vehicle id across
// both panes: hovering either half tints both together.
//
// Rows themselves don't navigate anywhere — viewing a vehicle's detail
// page is the Eye icon in the Actions column (vehicles-table.tsx), a
// deliberate change from an earlier version where clicking anywhere on
// the row navigated, which made it too easy to land on the detail page by
// accident while just reading the table.

import { createContext, useContext, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const RowHoverContext = createContext<{
  hoveredId: string | null;
  setHoveredId: Dispatch<SetStateAction<string | null>>;
}>({ hoveredId: null, setHoveredId: () => {} });

export function RowHoverProvider({ children }: { children: React.ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const value = { hoveredId, setHoveredId };
  return <RowHoverContext.Provider value={value}>{children}</RowHoverContext.Provider>;
}

export function HoverSyncRow({
  id,
  className,
  rowColour,
  children,
}: {
  id: string;
  className?: string;
  /** The Row Colour Status hex colour, if this row has one set — a plain
   * bg-muted hover tint is invisible against it (an inline background
   * always wins over a CSS class, colour or not), so a hovered coloured
   * row instead gets a slightly darkened mix of its *own* colour. Rows
   * with no colour fall back to the normal bg-muted hover via className. */
  rowColour?: string | null;
  children: React.ReactNode;
}) {
  const { hoveredId, setHoveredId } = useContext(RowHoverContext);
  const isHovered = hoveredId === id;

  const clearIfMine = useCallback(() => {
    setHoveredId((current) => (current === id ? null : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <TableRow
      // hover:bg-muted (full opacity) overrides TableRow's own default
      // hover:bg-muted/50 — needed so the pane actually under the pointer
      // (native :hover) and its synced sibling (plain bg-muted, forced via
      // JS state below) land on the exact same shade instead of two
      // slightly different intensities. Only applies when there's no row
      // colour — a class-based background can't beat the inline one below.
      className={cn(!rowColour && "hover:bg-muted", !rowColour && isHovered && "bg-muted", className)}
      style={rowColour ? { backgroundColor: isHovered ? `color-mix(in oklch, ${rowColour} 82%, black 15%)` : rowColour } : undefined}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={clearIfMine}
    >
      {children}
    </TableRow>
  );
}
