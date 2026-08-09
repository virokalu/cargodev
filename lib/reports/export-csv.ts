// "Excel" export, shared by all three Reports panels. This writes CSV
// rather than a real .xlsx: the only maintained npm package for that
// (xlsx/SheetJS) ships with an unpatched prototype-pollution/ReDoS advisory
// with no fix available (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9), and
// CLAUDE.md/OWASP guidance rules that out. Excel opens .csv natively
// (double-click just works on Windows), so this gets the same outcome for
// staff without the dependency.
"use client";

import { formatDate } from "@/lib/utils";
import { SHIPMENT_STATUS_META } from "@/lib/constants/shipment-status";
import { REPORT_VEHICLE_COLUMN_CONFIG, type ReportVehicleColumnKey } from "@/lib/constants/report-columns";
import type {
  AuctionHallReportGroup,
  CustomerReportGroup,
  DestinationReportGroup,
  FreightAgentReportGroup,
  ReportVehicleRow,
} from "@/lib/services/reports.service";

function vehicleHeaders(columns: ReportVehicleColumnKey[]): string[] {
  return [
    "Vehicle ID",
    "Vehicle",
    "Chassis",
    "Lot No",
    ...columns.map((key) => REPORT_VEHICLE_COLUMN_CONFIG[key].header),
    "ETD",
    "ETA",
    "Status",
  ];
}

// UTF-8 byte-order mark — without it Excel guesses the system codepage
// instead of UTF-8 and mangles any non-ASCII name.
const UTF8_BOM = "﻿";

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function vehicleRowCells(vehicle: ReportVehicleRow, columns: ReportVehicleColumnKey[]): string[] {
  return [
    vehicle.serial,
    vehicle.vehicleLabel,
    vehicle.chassisNo ?? "",
    vehicle.auctionLotNo ?? "",
    ...columns.map((key) => REPORT_VEHICLE_COLUMN_CONFIG[key].getValue(vehicle)),
    formatDate(vehicle.etd),
    formatDate(vehicle.eta),
    SHIPMENT_STATUS_META[vehicle.status].label,
  ];
}

function downloadCsv(headers: string[], rows: string[][], filename: string): void {
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const CUSTOMER_REPORT_COLUMNS: ReportVehicleColumnKey[] = ["auctionHall", "destination"];
const AUCTION_HALL_REPORT_COLUMNS: ReportVehicleColumnKey[] = ["customer", "destination"];
const DESTINATION_REPORT_COLUMNS: ReportVehicleColumnKey[] = ["auctionHall", "customer"];
const FREIGHT_AGENT_REPORT_COLUMNS: ReportVehicleColumnKey[] = ["customer", "shippingMethod"];

export function exportCustomerReportToCsv(customers: CustomerReportGroup[]): void {
  const headers = ["Customer", "Email", "Phone", "Country", ...vehicleHeaders(CUSTOMER_REPORT_COLUMNS)];
  const rows = customers.flatMap((customer) =>
    customer.vehicles.map((vehicle) => [
      customer.customerName,
      customer.email ?? "",
      customer.phone ?? "",
      customer.country ?? "",
      ...vehicleRowCells(vehicle, CUSTOMER_REPORT_COLUMNS),
    ])
  );
  downloadCsv(headers, rows, "customer-vehicle-report.csv");
}

export function exportAuctionHallReportToCsv(auctionHalls: AuctionHallReportGroup[]): void {
  const rows = auctionHalls.flatMap((hall) =>
    hall.vehicles.map((vehicle) => vehicleRowCells(vehicle, AUCTION_HALL_REPORT_COLUMNS))
  );
  downloadCsv(vehicleHeaders(AUCTION_HALL_REPORT_COLUMNS), rows, "auction-hall-report.csv");
}

export function exportDestinationReportToCsv(destinations: DestinationReportGroup[]): void {
  const rows = destinations.flatMap((destination) =>
    destination.vehicles.map((vehicle) => vehicleRowCells(vehicle, DESTINATION_REPORT_COLUMNS))
  );
  downloadCsv(vehicleHeaders(DESTINATION_REPORT_COLUMNS), rows, "destination-report.csv");
}

export function exportFreightAgentReportToCsv(freightAgents: FreightAgentReportGroup[]): void {
  const rows = freightAgents.flatMap((agent) =>
    agent.vehicles.map((vehicle) => vehicleRowCells(vehicle, FREIGHT_AGENT_REPORT_COLUMNS))
  );
  downloadCsv(vehicleHeaders(FREIGHT_AGENT_REPORT_COLUMNS), rows, "freight-agent-report.csv");
}
