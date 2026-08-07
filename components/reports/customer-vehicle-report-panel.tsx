"use client";

// Customer Vehicle tab of Reports (CD-D1-16) — client-side search/filter
// over a single server-fetched payload, same convention as the
// Users/Customers screens (small data set, no pagination needed) rather
// than the Vehicles table's URL-driven server refetch.

import { useMemo, useState } from "react";
import { Ban, Car, Mail, MapPin, Phone, Users } from "lucide-react";
import { ReportGroupCard } from "@/components/reports/report-group-card";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportSearchInput } from "@/components/reports/report-search-input";
import { ReportSelectFilter } from "@/components/reports/report-select-filter";
import { ReportStickyHeader } from "@/components/reports/report-sticky-header";
import { ReportSummaryTile } from "@/components/reports/report-summary-tile";
import { ReportTabs, type ReportTab } from "@/components/reports/report-tabs";
import { SHIPMENT_STATUS_META, SHIPMENT_STATUS_ORDER } from "@/lib/constants/shipment-status";
import { exportCustomerReportToCsv } from "@/lib/reports/export-csv";
import { exportCustomerReportToPdf } from "@/lib/reports/export-pdf";
import type {
  CustomerOption,
  CustomerReportGroup,
  ReportVehicleStatus,
} from "@/lib/services/reports.service";

interface CustomerVehicleReportPanelProps {
  customers: CustomerReportGroup[];
  customerOptions: CustomerOption[];
  destinationOptions: string[];
  auctionHallOptions: string[];
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

function ContactLine({
  email,
  phone,
  country,
}: {
  email: string | null;
  phone: string | null;
  country: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      {email && (
        <span className="inline-flex items-center gap-1">
          <Mail className="size-3" />
          {email}
        </span>
      )}
      {phone && (
        <span className="inline-flex items-center gap-1">
          <Phone className="size-3" />
          {phone}
        </span>
      )}
      {country && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" />
          {country}
        </span>
      )}
    </div>
  );
}

export function CustomerVehicleReportPanel({
  customers,
  customerOptions,
  destinationOptions,
  auctionHallOptions,
  activeTab,
  onTabChange,
}: CustomerVehicleReportPanelProps) {
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("ALL");
  const [status, setStatus] = useState<ReportVehicleStatus | "ALL">("ALL");
  const [destination, setDestination] = useState("ALL");
  const [auctionHall, setAuctionHall] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return customers
      .filter((customer) => customerId === "ALL" || customer.customerId === customerId)
      .map((customer) => {
        const customerMatches =
          !q ||
          customer.customerName.toLowerCase().includes(q) ||
          (customer.email ?? "").toLowerCase().includes(q) ||
          (customer.phone ?? "").toLowerCase().includes(q);

        const vehicles = customer.vehicles.filter((vehicle) => {
          if (status !== "ALL" && vehicle.status !== status) return false;
          if (destination !== "ALL" && vehicle.destination !== destination) return false;
          if (auctionHall !== "ALL" && vehicle.auctionHallName !== auctionHall) return false;
          if (customerMatches) return true;
          return (
            vehicle.serial.toLowerCase().includes(q) ||
            (vehicle.chassisNo ?? "").toLowerCase().includes(q) ||
            vehicle.vehicleLabel.toLowerCase().includes(q)
          );
        });

        return { ...customer, vehicles };
      })
      .filter((customer) => customer.vehicles.length > 0);
  }, [customers, search, customerId, status, destination, auctionHall]);

  const totals = useMemo(() => {
    let totalVehicles = 0;
    let totalCancelled = 0;
    for (const customer of filtered) {
      totalVehicles += customer.vehicles.length;
      totalCancelled += customer.vehicles.filter((v) => v.status === "CANCELLED").length;
    }
    return { totalCustomers: filtered.length, totalVehicles, totalCancelled };
  }, [filtered]);

  const hasResults = filtered.length > 0;

  return (
    <div className="space-y-6">
      <ReportStickyHeader>
        <ReportHeader
          onExportPdf={() => exportCustomerReportToPdf(filtered)}
          onExportCsv={() => exportCustomerReportToCsv(filtered)}
          exportDisabled={!hasResults}
        />

        <ReportTabs activeTab={activeTab} onTabChange={onTabChange} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReportSummaryTile
            icon={Users}
            tone="primary"
            value={totals.totalCustomers}
            label="Customers in report"
            sublabel="matching current filters"
          />
          <ReportSummaryTile
            icon={Car}
            tone="info"
            value={totals.totalVehicles}
            label="Vehicles listed"
            sublabel="across all customers"
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
            placeholder="Search customer, vehicle ID, chassis or model…"
          />
          <ReportSelectFilter
            value={customerId}
            onChange={setCustomerId}
            allLabel="All customers"
            className="w-full sm:w-[200px]"
            options={customerOptions.map((option) => ({ value: option.id, label: option.name }))}
          />
          <ReportSelectFilter
            value={status}
            onChange={(value) => setStatus(value as ReportVehicleStatus | "ALL")}
            allLabel="All statuses"
            options={SHIPMENT_STATUS_ORDER.map((value) => ({ value, label: SHIPMENT_STATUS_META[value].label }))}
          />
          <ReportSelectFilter
            value={destination}
            onChange={setDestination}
            allLabel="All destinations"
            options={destinationOptions.map((option) => ({ value: option, label: option }))}
          />
          <ReportSelectFilter
            value={auctionHall}
            onChange={setAuctionHall}
            allLabel="All auction halls"
            options={auctionHallOptions.map((option) => ({ value: option, label: option }))}
          />
        </div>
      </ReportStickyHeader>

      <div className="space-y-3">
        {hasResults ? (
          filtered.map((customer) => (
            <ReportGroupCard
              key={customer.customerId}
              title={customer.customerName}
              subtitle={<ContactLine email={customer.email} phone={customer.phone} country={customer.country} />}
              vehicles={customer.vehicles}
              statusCounts={customer.statusCounts}
              onDownloadPdf={() => exportCustomerReportToPdf([customer])}
              extraColumns={["auctionHall", "destination"]}
            />
          ))
        ) : (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No customers match your search and filters.
          </div>
        )}
      </div>
    </div>
  );
}
