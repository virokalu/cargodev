// Which "identity" columns (Auction Hall / Destination / Customer) each
// Reports panel shows in its vehicle table, plus how to render each one.
// Shared by the on-screen table (report-group-card.tsx) and both exports
// (lib/reports/export-pdf.ts, export-csv.ts) so the three never drift.
//
// Every panel shows two of the three — whichever one *is* the current
// grouping is left out, since repeating it as a column would just echo the
// group's own title on every row.

import type { ReportVehicleRow } from "@/lib/services/reports.service";

export type ReportVehicleColumnKey = "auctionHall" | "destination" | "customer";

export const REPORT_VEHICLE_COLUMN_CONFIG: Record<
  ReportVehicleColumnKey,
  { header: string; getValue: (vehicle: ReportVehicleRow) => string }
> = {
  auctionHall: { header: "Auction Hall", getValue: (vehicle) => vehicle.auctionHallName ?? "—" },
  destination: { header: "Destination", getValue: (vehicle) => vehicle.destination ?? "—" },
  customer: { header: "Customer", getValue: (vehicle) => vehicle.customerName ?? "—" },
};
