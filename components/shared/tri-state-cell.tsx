// Read-only display for a tri-state boolean (Auction Bill Paid / Log Book /
// Extra Key — CLAUDE.md: null = not entered, true = Yes, false = No, never
// default to false). Used wherever a tri-state field is shown but not
// edited: the vehicles table (when the viewer can't write) and the vehicle
// detail page. The editable versions are TriStateToggle (form control) and
// AuctionBillPaidCell (inline dropdown pill) — this is display-only.

import { Badge } from "@/components/ui/badge";

export function TriStateCell({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={value ? "success" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
}
