"use client";

// Freight Agent tab of Reports — same pattern as AuctionHallReportPanel,
// grouped by the freight agent handling the shipment. Unlike the other 3
// tabs, this one has no FC/FL track toggle: freightAgentId is one of the
// fields vehicle.service.ts nulls out for FL on both create and update, so
// freight agents are only ever assigned to FC vehicles — there's no FL data
// to switch to (see lib/services/reports.service.ts's
// getFreightAgentVehicleReport). Shows Customer + Shipping Method as its
// two extra columns instead of Auction Hall/Destination, since Method ties
// directly to which freight agent is handling the shipment.

import { useMemo, useState } from "react";
import { Ban, Car, Truck } from "lucide-react";
import { ReportGroupCard } from "@/components/reports/report-group-card";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportSearchInput } from "@/components/reports/report-search-input";
import { ReportSelectFilter } from "@/components/reports/report-select-filter";
import { ReportStickyHeader } from "@/components/reports/report-sticky-header";
import { ReportSummaryTile } from "@/components/reports/report-summary-tile";
import { ReportTabs, type ReportTab } from "@/components/reports/report-tabs";
import { SHIPMENT_STATUS_META, SHIPMENT_STATUS_ORDER } from "@/lib/constants/shipment-status";
import { exportFreightAgentReportToCsv } from "@/lib/reports/export-csv";
import { exportFreightAgentReportToPdf } from "@/lib/reports/export-pdf";
import type { FreightAgentVehicleReportData, ReportVehicleStatus } from "@/lib/services/reports.service";

interface FreightAgentReportPanelProps {
  data: FreightAgentVehicleReportData;
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

export function FreightAgentReportPanel({ data, activeTab, onTabChange }: FreightAgentReportPanelProps) {
  const [search, setSearch] = useState("");
  const [freightAgentId, setFreightAgentId] = useState("ALL");
  const [status, setStatus] = useState<ReportVehicleStatus | "ALL">("ALL");

  const { freightAgents, freightAgentOptions } = data;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return freightAgents
      .filter((agent) => freightAgentId === "ALL" || agent.freightAgentId === freightAgentId)
      .map((agent) => {
        const agentMatches = !q || agent.freightAgentName.toLowerCase().includes(q);

        const vehicles = agent.vehicles.filter((vehicle) => {
          if (status !== "ALL" && vehicle.status !== status) return false;
          if (agentMatches) return true;
          return (
            vehicle.serial.toLowerCase().includes(q) ||
            (vehicle.chassisNo ?? "").toLowerCase().includes(q) ||
            vehicle.vehicleLabel.toLowerCase().includes(q)
          );
        });

        return { ...agent, vehicles };
      })
      .filter((agent) => agent.vehicles.length > 0);
  }, [freightAgents, search, freightAgentId, status]);

  const totals = useMemo(() => {
    let totalVehicles = 0;
    let totalCancelled = 0;
    for (const agent of filtered) {
      totalVehicles += agent.vehicles.length;
      totalCancelled += agent.vehicles.filter((v) => v.status === "CANCELLED").length;
    }
    return { totalFreightAgents: filtered.length, totalVehicles, totalCancelled };
  }, [filtered]);

  const hasResults = filtered.length > 0;

  return (
    <div className="space-y-6">
      <ReportStickyHeader>
        <ReportHeader
          onExportPdf={() => exportFreightAgentReportToPdf(filtered)}
          onExportCsv={() => exportFreightAgentReportToCsv(filtered)}
          exportDisabled={!hasResults}
        />

        <ReportTabs activeTab={activeTab} onTabChange={onTabChange} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReportSummaryTile
            icon={Truck}
            tone="primary"
            value={totals.totalFreightAgents}
            label="Freight agents in report"
            sublabel="matching current filters"
          />
          <ReportSummaryTile
            icon={Car}
            tone="info"
            value={totals.totalVehicles}
            label="Vehicles listed"
            sublabel="across all freight agents"
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
            placeholder="Search freight agent, vehicle ID, chassis or model…"
          />
          <ReportSelectFilter
            value={freightAgentId}
            onChange={setFreightAgentId}
            allLabel="All freight agents"
            className="w-full sm:w-[200px]"
            options={freightAgentOptions.map((option) => ({ value: option.id, label: option.name }))}
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
          filtered.map((agent) => (
            <ReportGroupCard
              key={agent.freightAgentId}
              title={agent.freightAgentName}
              subtitle={<p className="text-xs text-muted-foreground">Freight agent report</p>}
              vehicles={agent.vehicles}
              statusCounts={agent.statusCounts}
              onDownloadPdf={() => exportFreightAgentReportToPdf([agent])}
              extraColumns={["customer", "shippingMethod"]}
            />
          ))
        ) : (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No freight agents match your search and filters.
          </div>
        )}
      </div>
    </div>
  );
}
