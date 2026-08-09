"use client";

// Makes a vehicles-table row navigate to the vehicle's detail page (US-10)
// on click, without turning the whole (deliberately server-rendered) table
// into a client component — same "isolate the one interactive bit into a
// small leaf" pattern as DetailPaneTable/StatusScrollProvider in
// status-scroll-context.tsx. Row clicks must not hijack the Edit/Delete
// buttons or the Auction Bill Paid / Row Colour Status dropdowns nested
// inside the row, so anything landing on a real interactive element is
// left alone — only a click on plain cell content navigates.
//
// The identity pane (Serial/Chassis/Model/Actions) and the detail pane
// (everything else) are two separate <table>s (see vehicles-table.tsx's
// top comment) so a vehicle's "one row" is actually two unrelated <tr>s in
// two unrelated tables — plain CSS :hover only lights up whichever table
// the pointer happens to be over. It's meant to read and act as a single
// row regardless, so RowHoverProvider mirrors the hovered vehicle id
// across both panes: hovering either half tints both together.

import { createContext, useContext, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// [data-slot="select-content"] covers the Auction Bill Paid / Row Colour
// Status dropdowns' *popup* specifically — Base UI's Select renders it
// through a Portal, so its DOM lives outside this row entirely, but React
// still bubbles the click through the component tree (JSX ancestry, not
// DOM ancestry) up to this row's onClick. Without this, event.target on a
// selected option is a plain <div> that the plain "a, button, ..." check
// below doesn't recognize as interactive, so choosing an option was
// wrongly treated as "click landed on cell content" and navigated away.
const INTERACTIVE_SELECTOR = "a, button, [role='button'], select, input, [data-slot='select-content']";

const RowHoverContext = createContext<{
  hoveredId: string | null;
  setHoveredId: Dispatch<SetStateAction<string | null>>;
}>({ hoveredId: null, setHoveredId: () => {} });

export function RowHoverProvider({ children }: { children: React.ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const value = { hoveredId, setHoveredId };
  return <RowHoverContext.Provider value={value}>{children}</RowHoverContext.Provider>;
}

export function ClickableRow({
  id,
  href,
  className,
  rowColour,
  children,
}: {
  id: string;
  href: string;
  className?: string;
  /** The Row Colour Status hex colour, if this row has one set — a plain
   * bg-muted hover tint is invisible against it (an inline background
   * always wins over a CSS class, colour or not), so a hovered coloured
   * row instead gets a slightly darkened mix of its *own* colour. Rows
   * with no colour fall back to the normal bg-muted hover via className. */
  rowColour?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
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
      className={cn("cursor-pointer", !rowColour && "hover:bg-muted", !rowColour && isHovered && "bg-muted", className)}
      style={rowColour ? { backgroundColor: isHovered ? `color-mix(in oklch, ${rowColour} 82%, black 15%)` : rowColour } : undefined}
      onMouseEnter={() => setHoveredId(id)}
      onMouseLeave={clearIfMine}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
