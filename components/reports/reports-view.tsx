"use client";

// Top-level Reports switcher — owns which tab is active and hands off to
// the matching panel. The tab control itself is rendered *inside* whichever
// panel is currently mounted (see report-tabs.tsx) so this component stays
// a plain switch, not a shared layout wrapper. Each report type carries
// both FC and FL data (fetched up front in page.tsx) so its panel's own
// FC/FL toggle can switch instantly with no refetch.

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
  customerData: { fc: CustomerVehicleReportData; fl: CustomerVehicleReportData };
  auctionHallData: { fc: AuctionHallVehicleReportData; fl: AuctionHallVehicleReportData };
  destinationData: { fc: DestinationVehicleReportData; fl: DestinationVehicleReportData };
}

export function ReportsView({ customerData, auctionHallData, destinationData }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("customer");

  if (activeTab === "auctionHall") {
    return <AuctionHallReportPanel data={auctionHallData} activeTab={activeTab} onTabChange={setActiveTab} />;
  }

  if (activeTab === "destination") {
    return <DestinationReportPanel data={destinationData} activeTab={activeTab} onTabChange={setActiveTab} />;
  }

  return <CustomerVehicleReportPanel data={customerData} activeTab={activeTab} onTabChange={setActiveTab} />;
}
