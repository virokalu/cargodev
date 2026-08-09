// Which "identity" columns (Auction Hall / Destination / Customer / Freight
// Agent / Method) each Reports panel shows in its vehicle table, plus how
// to render each one. Shared by the on-screen table (report-group-card.tsx)
// and both exports (lib/reports/export-pdf.ts, export-csv.ts) so the three
// never drift.
//
// Every panel shows exactly two of these — whichever one *is* the current
// grouping is left out, since repeating it as a column would just echo the
// group's own title on every row (e.g. the Freight Agent report is grouped
// by freight agent, so "freightAgent" itself is never one of its two —
// it shows "customer" and "shippingMethod" instead; see
// freight-agent-report-panel.tsx).

import type { ReportVehicleRow } from "@/lib/services/reports.service";

export type ReportVehicleColumnKey = "auctionHall" | "destination" | "customer" | "freightAgent" | "shippingMethod";

export const REPORT_VEHICLE_COLUMN_CONFIG: Record<
  ReportVehicleColumnKey,
  { header: string; getValue: (vehicle: ReportVehicleRow) => string }
> = {
  auctionHall: { header: "Auction Hall", getValue: (vehicle) => vehicle.auctionHallName ?? "—" },
  destination: { header: "Destination", getValue: (vehicle) => vehicle.destination ?? "—" },
  customer: { header: "Customer", getValue: (vehicle) => vehicle.customerName ?? "—" },
  freightAgent: { header: "Freight Agent", getValue: (vehicle) => vehicle.freightAgentName ?? "—" },
  shippingMethod: {
    header: "Method",
    getValue: (vehicle) =>
      vehicle.shippingMethod === "RORO" ? "RORO" : vehicle.shippingMethod === "CONTAINER" ? "Container" : "—",
  },
};
