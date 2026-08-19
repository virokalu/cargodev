"use client";

// One collapsible group block, shared by all four Reports tabs (Customer
// Vehicle / Auction Hall / Destination / Freight Agent) — only the
// "identity" header (title + subtitle) and which field is being grouped by
// differ; the vehicle table underneath is identical everywhere, so it lives
// here once rather than four times. Status column reuses the exact same
// Badge + SHIPMENT_STATUS_META the Vehicles table's Shipment Status column
// uses — one status vocabulary across every screen, not a separate "report
// status".
//
// Mobile: renders as two side-by-side <table>s, same idea as the Vehicles
// table (vehicles-table.tsx) — a narrow identity pane (Vehicle ID / Vehicle,
// the two fields that say which row you're looking at) next to a detail
// pane (everything else). Both panes get an equal share of the available
// width (flex-1) and scroll horizontally *independently* — giving the
// identity pane a fixed 260px instead squeezed the detail pane down to
// almost nothing on a narrow phone, since 260px alone eats most of a
// ~375px screen. At 50/50 the identity pane's own ~260px of content now
// needs its own scroll on narrow screens too (same as the Vehicles table),
// but the detail pane gets a usable amount of room instead of a sliver.

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SHIPMENT_STATUS_META, SHIPMENT_STATUS_ORDER } from "@/lib/constants/shipment-status";
import { REPORT_VEHICLE_COLUMN_CONFIG, type ReportVehicleColumnKey } from "@/lib/constants/report-columns";
import { cn, formatDate } from "@/lib/utils";
import type { ReportVehicleRow, ReportVehicleStatus } from "@/lib/services/reports.service";

// Two independent <table>s can't share row heights automatically — each
// sizes its own rows from its own content, and the detail pane's Status
// column holds a <Badge> that renders slightly taller than the identity
// pane's plain text, so without this their horizontal row lines drift out
// of alignment a little more with every row. Pinning both panes' body rows
// to the same explicit height keeps every row lined up across the two
// (same fix, same value, as vehicles-table.tsx's ROW_HEIGHT_CLASS).
const ROW_HEIGHT_CLASS = "h-[52px]";

interface ReportGroupCardProps {
  title: string;
  subtitle?: ReactNode;
  vehicles: ReportVehicleRow[];
  statusCounts: Record<ReportVehicleStatus, number>;
  onDownloadPdf: () => void;
  extraColumns: ReportVehicleColumnKey[];
  defaultOpen?: boolean;
}

export function ReportGroupCard({
  title,
  subtitle,
  vehicles,
  statusCounts,
  onDownloadPdf,
  extraColumns,
  defaultOpen = false,
}: ReportGroupCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const vehicleCount = vehicles.length;

  function toggleOpen() {
    setOpen((prev) => !prev);
  }

  // The whole row toggles expand/collapse (a plain <button> can't contain
  // the nested PDF-download button below, so this is a div standing in for
  // one — role/tabIndex/onKeyDown keep it keyboard-accessible).
  function handleHeaderKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleOpen();
    }
  }

  return (
    <div className="rounded-lg border">
      <div
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={handleHeaderKeyDown}
        // relative + pr-12 so the PDF button below can anchor to this card's
        // top-right corner (position: absolute) instead of being just the
        // last item in the badge row's own flex-wrap — as the last wrapped
        // item it would land at the *start* of whatever line it wrapped to
        // (e.g. a 4th status badge pushing it down), not pinned to the
        // right. pr-12 (48px) clears the button's 28px footprint at
        // right-2.5 with room to spare, so wrapped badge text never runs
        // under it. Same anchoring technique as DialogContent's close
        // button (components/ui/dialog.tsx).
        className="relative flex w-full flex-col items-start gap-2 px-4 py-3 pr-12 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-start gap-2">
          <ChevronRight
            className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
          />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{title}</p>
            {subtitle}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold whitespace-nowrap text-foreground">
            {vehicleCount} Vehicle{vehicleCount === 1 ? "" : "s"}
          </span>
          {SHIPMENT_STATUS_ORDER.filter((status) => statusCounts[status] > 0).map((status) => (
            <span key={status} className="whitespace-nowrap">
              {statusCounts[status]} {SHIPMENT_STATUS_META[status].label}
            </span>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-2.5 right-2.5"
          aria-label={`Download PDF for ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            onDownloadPdf();
          }}
        >
          <FileText className="size-4" />
        </Button>
      </div>

      {open && (
        <div className="flex overflow-hidden border-t">
          {/* Identity pane — Vehicle ID / Vehicle, equal share of the width,
              scrolls horizontally on its own if narrower than its ~260px
              of content. */}
          <div className="min-w-0 flex-1 border-r">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] min-w-[100px] border-r">Vehicle ID</TableHead>
                  <TableHead className="w-[160px] min-w-[160px]">Vehicle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className={ROW_HEIGHT_CLASS}>
                    <TableCell className="border-r font-mono font-medium">{vehicle.serial}</TableCell>
                    <TableCell>{vehicle.vehicleLabel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Detail pane — everything else, equal share of the width,
              scrolls horizontally on its own. */}
          <div className="min-w-0 flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="border-r">Chassis</TableHead>
                  <TableHead className="border-r">Lot No.</TableHead>
                  {extraColumns.map((key) => (
                    <TableHead key={key} className="border-r">
                      {REPORT_VEHICLE_COLUMN_CONFIG[key].header}
                    </TableHead>
                  ))}
                  <TableHead className="border-r">ETD</TableHead>
                  <TableHead className="border-r">ETA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className={ROW_HEIGHT_CLASS}>
                    <TableCell className="border-r font-mono text-xs text-muted-foreground">
                      {vehicle.chassisNo ?? "—"}
                    </TableCell>
                    <TableCell className="border-r">{vehicle.auctionLotNo ?? "—"}</TableCell>
                    {extraColumns.map((key) => (
                      <TableCell key={key} className="border-r">
                        {REPORT_VEHICLE_COLUMN_CONFIG[key].getValue(vehicle)}
                      </TableCell>
                    ))}
                    <TableCell className="border-r">{formatDate(vehicle.etd)}</TableCell>
                    <TableCell className="border-r">{formatDate(vehicle.eta)}</TableCell>
                    <TableCell>
                      <Badge variant={SHIPMENT_STATUS_META[vehicle.status].badgeVariant}>
                        {SHIPMENT_STATUS_META[vehicle.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}