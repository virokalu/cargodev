"use client";

// Top-level Reports switcher — owns which tab is active and hands off to
// the matching panel. The tab control itself is rendered *inside* whichever
// panel is currently mounted (see report-tabs.tsx) so this component stays
// a plain switch, not a shared layout wrapper.

import { useState } from "react";
import { AuctionHallReportPanel } from "@/components/reports/auction-hall-report-panel";
import { CustomerVehicleReportPanel } from "@/components/reports/customer-vehicle-report-panel";
import { DestinationReportPanel } from "@/components/reports/destination-report-panel";
import type { ReportTab } from "@/components/reports/report-tabs";
import type {
  AuctionHallVehicleReportData,
  CustomerVehicleReportData,
  DestinationVehicleReportData,
} from "@/lib/services/reports.service";

interface ReportsViewProps {
  customerData: CustomerVehicleReportData;
  auctionHallData: AuctionHallVehicleReportData;
  destinationData: DestinationVehicleReportData;
}

export function ReportsView({ customerData, auctionHallData, destinationData }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("customer");

  if (activeTab === "auctionHall") {
    return (
      <AuctionHallReportPanel
        auctionHalls={auctionHallData.auctionHalls}
        auctionHallOptions={auctionHallData.auctionHallOptions}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    );
  }

  if (activeTab === "destination") {
    return (
      <DestinationReportPanel
        destinations={destinationData.destinations}
        destinationOptions={destinationData.destinationOptions}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    );
  }

  return (
    <CustomerVehicleReportPanel
      customers={customerData.customers}
      customerOptions={customerData.customerOptions}
      destinationOptions={customerData.destinationOptions}
      auctionHallOptions={customerData.auctionHallOptions}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
}
