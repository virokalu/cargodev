"use client";

// Auction Hall tab of Reports — same pattern as CustomerVehicleReportPanel,
// just grouped by auction hall instead of customer, and with the smaller
// 2-filter set (auction hall + status) that its own approved design
// (docs/designs/Auctionhall_Report.png) shows, rather than the Customer tab's
// extra destination/auction-hall cross-filters.

import { useMemo, useState } from "react";
import { Ban, Car, Gavel } from "lucide-react";
import { ReportGroupCard } from "@/components/reports/report-group-card";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportSearchInput } from "@/components/reports/report-search-input";
import { ReportSelectFilter } from "@/components/reports/report-select-filter";
import { ReportSummaryTile } from "@/components/reports/report-summary-tile";
import { ReportTabs, type ReportTab } from "@/components/reports/report-tabs";
import { SHIPMENT_STATUS_META, SHIPMENT_STATUS_ORDER } from "@/lib/constants/shipment-status";
import { exportAuctionHallReportToCsv } from "@/lib/reports/export-csv";
import { exportAuctionHallReportToPdf } from "@/lib/reports/export-pdf";
import type { AuctionHallOption, AuctionHallReportGroup, ReportVehicleStatus } from "@/lib/services/reports.service";

interface AuctionHallReportPanelProps {
  auctionHalls: AuctionHallReportGroup[];
  auctionHallOptions: AuctionHallOption[];
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

export function AuctionHallReportPanel({
  auctionHalls,
  auctionHallOptions,
  activeTab,
  onTabChange,
}: AuctionHallReportPanelProps) {
  const [search, setSearch] = useState("");
  const [auctionHallId, setAuctionHallId] = useState("ALL");
  const [status, setStatus] = useState<ReportVehicleStatus | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return auctionHalls
      .filter((hall) => auctionHallId === "ALL" || hall.auctionHallId === auctionHallId)
      .map((hall) => {
        const hallMatches = !q || hall.auctionHallName.toLowerCase().includes(q);

        const vehicles = hall.vehicles.filter((vehicle) => {
          if (status !== "ALL" && vehicle.status !== status) return false;
          if (hallMatches) return true;
          return (
            vehicle.serial.toLowerCase().includes(q) ||
            (vehicle.chassisNo ?? "").toLowerCase().includes(q) ||
            (vehicle.auctionLotNo ?? "").toLowerCase().includes(q) ||
            vehicle.vehicleLabel.toLowerCase().includes(q)
          );
        });

        return { ...hall, vehicles };
      })
      .filter((hall) => hall.vehicles.length > 0);
  }, [auctionHalls, search, auctionHallId, status]);

  const totals = useMemo(() => {
    let totalVehicles = 0;
    let totalCancelled = 0;
    for (const hall of filtered) {
      totalVehicles += hall.vehicles.length;
      totalCancelled += hall.vehicles.filter((v) => v.status === "CANCELLED").length;
    }
    return { totalAuctionHalls: filtered.length, totalVehicles, totalCancelled };
  }, [filtered]);

  const hasResults = filtered.length > 0;

  return (
    <div className="space-y-6">
      <ReportHeader
        onExportPdf={() => exportAuctionHallReportToPdf(filtered)}
        onExportCsv={() => exportAuctionHallReportToCsv(filtered)}
        exportDisabled={!hasResults}
      />

      <ReportTabs activeTab={activeTab} onTabChange={onTabChange} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ReportSummaryTile
          icon={Gavel}
          tone="primary"
          value={totals.totalAuctionHalls}
          label="Auction halls in report"
          sublabel="matching current filters"
        />
        <ReportSummaryTile
          icon={Car}
          tone="info"
          value={totals.totalVehicles}
          label="Vehicles listed"
          sublabel="across all auction halls"
        />
        <ReportSummaryTile
          icon={Ban}
          tone="destructive"
          value={totals.totalCancelled}
          label="Shipment Cancelled"
          sublabel="no longer being shipped"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ReportSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search auction hall, lot, vehicle ID or model…"
        />
        <ReportSelectFilter
          value={auctionHallId}
          onChange={setAuctionHallId}
          allLabel="All auction halls"
          className="w-full sm:w-[200px]"
          options={auctionHallOptions.map((option) => ({ value: option.id, label: option.name }))}
        />
        <ReportSelectFilter
          value={status}
          onChange={(value) => setStatus(value as ReportVehicleStatus | "ALL")}
          allLabel="All statuses"
          options={SHIPMENT_STATUS_ORDER.map((value) => ({ value, label: SHIPMENT_STATUS_META[value].label }))}
        />
      </div>

      <div className="space-y-3">
        {hasResults ? (
          filtered.map((hall) => (
            <ReportGroupCard
              key={hall.auctionHallId}
              title={hall.auctionHallName}
              subtitle={<p className="text-xs text-muted-foreground">Auction hall report</p>}
              vehicles={hall.vehicles}
              statusCounts={hall.statusCounts}
              onDownloadPdf={() => exportAuctionHallReportToPdf([hall])}
              extraColumns={["customer", "destination"]}
            />
          ))
        ) : (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No auction halls match your search and filters.
          </div>
        )}
      </div>
    </div>
  );
}
