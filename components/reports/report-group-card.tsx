"use client";

// One collapsible group block, shared by all three Reports tabs (Customer
// Vehicle / Auction Hall / Destination) — only the "identity" header
// (title + subtitle) and which field is being grouped by differ; the
// vehicle table underneath is identical everywhere, so it lives here once
// rather than three times. Status column reuses the exact same Badge +
// SHIPMENT_STATUS_META the Vehicles table's Shipment Status column uses —
// one status vocabulary across every screen, not a separate "report
// status". Visual recipe (rounded-lg border container, border-r column
// dividers) matches vehicles-table.tsx per the approved design.

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SHIPMENT_STATUS_META, SHIPMENT_STATUS_ORDER } from "@/lib/constants/shipment-status";
import { REPORT_VEHICLE_COLUMN_CONFIG, type ReportVehicleColumnKey } from "@/lib/constants/report-columns";
import { cn, formatDate } from "@/lib/utils";
import type { ReportVehicleRow, ReportVehicleStatus } from "@/lib/services/reports.service";

interface ReportGroupCardProps {
  title: string;
  subtitle?: ReactNode;
  vehicles: ReportVehicleRow[];
  statusCounts: Record<ReportVehicleStatus, number>;
  delayedCount: number;
  onDownloadPdf: () => void;
  extraColumns: ReportVehicleColumnKey[];
  defaultOpen?: boolean;
}

export function ReportGroupCard({
  title,
  subtitle,
  vehicles,
  statusCounts,
  delayedCount,
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
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
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

        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {vehicleCount} Vehicle{vehicleCount === 1 ? "" : "s"}
          </span>
          {SHIPMENT_STATUS_ORDER.filter((status) => statusCounts[status] > 0).map((status) => (
            <span key={status}>
              {statusCounts[status]} {SHIPMENT_STATUS_META[status].label}
            </span>
          ))}
          {delayedCount > 0 && <span className="font-medium text-destructive">{delayedCount} Delayed</span>}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Download PDF for ${title}`}
            onClick={(event) => {
              event.stopPropagation();
              onDownloadPdf();
            }}
          >
            <FileText className="size-4" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="border-r">Vehicle ID</TableHead>
                <TableHead className="border-r">Vehicle</TableHead>
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
                <TableRow key={vehicle.id}>
                  <TableCell className="border-r font-mono font-medium">{vehicle.serial}</TableCell>
                  <TableCell className="border-r">{vehicle.vehicleLabel}</TableCell>
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
                    <div className="flex items-center gap-1.5">
                      <Badge variant={SHIPMENT_STATUS_META[vehicle.status].badgeVariant}>
                        {SHIPMENT_STATUS_META[vehicle.status].label}
                      </Badge>
                      {vehicle.isDelayed && <Badge variant="destructive">Delayed</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
