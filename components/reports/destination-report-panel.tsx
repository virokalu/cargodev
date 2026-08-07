"use client";

// Destination tab of Reports — same pattern as AuctionHallReportPanel, just
// grouped by destination country. Destination is free text on Vehicle (no
// lookup table), so the group key is the destination string itself rather
// than an id — see lib/services/reports.service.ts.

import { useMemo, useState } from "react";
import { Ban, Car, Globe } from "lucide-react";
import { ReportGroupCard } from "@/components/reports/report-group-card";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportSearchInput } from "@/components/reports/report-search-input";
import { ReportSelectFilter } from "@/components/reports/report-select-filter";
import { ReportStickyHeader } from "@/components/reports/report-sticky-header";
import { ReportSummaryTile } from "@/components/reports/report-summary-tile";
import { ReportTabs, type ReportTab } from "@/components/reports/report-tabs";
import { SHIPMENT_STATUS_META, SHIPMENT_STATUS_ORDER } from "@/lib/constants/shipment-status";
import { exportDestinationReportToCsv } from "@/lib/reports/export-csv";
import { exportDestinationReportToPdf } from "@/lib/reports/export-pdf";
import type { DestinationReportGroup, ReportVehicleStatus } from "@/lib/services/reports.service";

interface DestinationReportPanelProps {
  destinations: DestinationReportGroup[];
  destinationOptions: string[];
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

export function DestinationReportPanel({
  destinations,
  destinationOptions,
  activeTab,
  onTabChange,
}: DestinationReportPanelProps) {
  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState("ALL");
  const [status, setStatus] = useState<ReportVehicleStatus | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return destinations
      .filter((entry) => destination === "ALL" || entry.destination === destination)
      .map((entry) => {
        const destinationMatches = !q || entry.destination.toLowerCase().includes(q);

        const vehicles = entry.vehicles.filter((vehicle) => {
          if (status !== "ALL" && vehicle.status !== status) return false;
          if (destinationMatches) return true;
          return (
            vehicle.serial.toLowerCase().includes(q) ||
            (vehicle.chassisNo ?? "").toLowerCase().includes(q) ||
            vehicle.vehicleLabel.toLowerCase().includes(q)
          );
        });

        return { ...entry, vehicles };
      })
      .filter((entry) => entry.vehicles.length > 0);
  }, [destinations, search, destination, status]);

  const totals = useMemo(() => {
    let totalVehicles = 0;
    let totalCancelled = 0;
    for (const entry of filtered) {
      totalVehicles += entry.vehicles.length;
      totalCancelled += entry.vehicles.filter((v) => v.status === "CANCELLED").length;
    }
    return { totalDestinations: filtered.length, totalVehicles, totalCancelled };
  }, [filtered]);

  const hasResults = filtered.length > 0;

  return (
    <div className="space-y-6">
      <ReportStickyHeader>
        <ReportHeader
          onExportPdf={() => exportDestinationReportToPdf(filtered)}
          onExportCsv={() => exportDestinationReportToCsv(filtered)}
          exportDisabled={!hasResults}
        />

        <ReportTabs activeTab={activeTab} onTabChange={onTabChange} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReportSummaryTile
            icon={Globe}
            tone="primary"
            value={totals.totalDestinations}
            label="Destinations in report"
            sublabel="matching current filters"
          />
          <ReportSummaryTile
            icon={Car}
            tone="info"
            value={totals.totalVehicles}
            label="Vehicles listed"
            sublabel="across all destinations"
          />
          <ReportSummaryTile
            icon={Ban}
            tone="destructive"
            value={totals.totalCancelled}
            label="Shipment Cancelled"
            sublabel="no longer being shipped"
          />
        </div>

        <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-center">
          <ReportSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search destination, vehicle ID, chassis or model…"
          />
          <ReportSelectFilter
            value={destination}
            onChange={setDestination}
            allLabel="All destinations"
            className="w-full sm:w-[200px]"
            options={destinationOptions.map((option) => ({ value: option, label: option }))}
          />
          <ReportSelectFilter
            value={status}
            onChange={(value) => setStatus(value as ReportVehicleStatus | "ALL")}
            allLabel="All statuses"
            options={SHIPMENT_STATUS_ORDER.map((value) => ({ value, label: SHIPMENT_STATUS_META[value].label }))}
          />
        </div>
      </ReportStickyHeader>

      <div className="space-y-3">
        {hasResults ? (
          filtered.map((entry) => (
            <ReportGroupCard
              key={entry.destination}
              title={entry.destination}
              subtitle={<p className="text-xs text-muted-foreground">Destination report</p>}
              vehicles={entry.vehicles}
              statusCounts={entry.statusCounts}
              onDownloadPdf={() => exportDestinationReportToPdf([entry])}
              extraColumns={["auctionHall", "customer"]}
            />
          ))
        ) : (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No destinations match your search and filters.
          </div>
        )}
      </div>
    </div>
  );
}
