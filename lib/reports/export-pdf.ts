// Client-side PDF export, shared by all three Reports panels — takes
// whatever the on-screen filters currently show and lays it out the same
// way (one table per group), rather than a separate export-time query. No
// server round trip; jsPDF builds the file entirely in the browser and
// triggers the download. The three exported functions are thin wrappers
// that turn each report's group shape (customer/auction hall/destination)
// into the same generic "section" shape before handing off to the shared
// page-layout logic — that layout (page breaks, footer, headings) is the
// part that's actually tricky to get right, so it exists once.
"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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

// jspdf-autotable sets this on the doc instance after each call but doesn't
// type it — see node_modules/jspdf-autotable's runtime source (`jsPDFDoc.lastAutoTable`).
interface DocWithLastAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

interface ReportPdfSection {
  title: string;
  subtitle?: string;
  vehicles: ReportVehicleRow[];
}

const PAGE_MARGIN = 40;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "report";
}

function buildReportPdf(
  sections: ReportPdfSection[],
  title: string,
  columns: ReportVehicleColumnKey[]
): DocWithLastAutoTable {
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as DocWithLastAutoTable;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(title, PAGE_MARGIN, PAGE_MARGIN);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${formatDate(new Date())}`, PAGE_MARGIN, PAGE_MARGIN + 14);
  doc.setTextColor(0);

  let cursorY = PAGE_MARGIN + 34;

  for (const section of sections) {
    // Heading text is drawn outside autoTable, so it needs its own
    // page-break check — autoTable only guards its own rows.
    if (cursorY + 40 > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      cursorY = PAGE_MARGIN;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, PAGE_MARGIN, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    if (section.subtitle) doc.text(section.subtitle, PAGE_MARGIN, cursorY + 13);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: cursorY + (section.subtitle ? 20 : 8),
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [
        [
          "Vehicle ID",
          "Vehicle",
          "Chassis",
          "Lot No.",
          ...columns.map((key) => REPORT_VEHICLE_COLUMN_CONFIG[key].header),
          "ETD",
          "ETA",
          "Status",
        ],
      ],
      body: section.vehicles.map((v) => [
        v.serial,
        v.vehicleLabel,
        v.chassisNo ?? "—",
        v.auctionLotNo ?? "—",
        ...columns.map((key) => REPORT_VEHICLE_COLUMN_CONFIG[key].getValue(v)),
        formatDate(v.etd),
        formatDate(v.eta),
        SHIPMENT_STATUS_META[v.status].label,
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
      theme: "grid",
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 24;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 16, { align: "right" });
  }

  return doc;
}

export function exportCustomerReportToPdf(customers: CustomerReportGroup[]): void {
  const sections: ReportPdfSection[] = customers.map((c) => ({
    title: c.customerName,
    subtitle: [c.email, c.phone, c.country].filter(Boolean).join("  ·  ") || undefined,
    vehicles: c.vehicles,
  }));
  const isSingle = sections.length === 1;
  const doc = buildReportPdf(
    sections,
    isSingle ? `Vehicle Report — ${sections[0].title}` : "Customer Vehicle Report",
    ["auctionHall", "destination"]
  );
  doc.save(isSingle ? `${slugify(sections[0].title)}-vehicle-report.pdf` : "customer-vehicle-report.pdf");
}

export function exportAuctionHallReportToPdf(auctionHalls: AuctionHallReportGroup[]): void {
  const sections: ReportPdfSection[] = auctionHalls.map((h) => ({
    title: h.auctionHallName,
    vehicles: h.vehicles,
  }));
  const isSingle = sections.length === 1;
  const doc = buildReportPdf(
    sections,
    isSingle ? `Auction Hall Report — ${sections[0].title}` : "Auction Hall Report",
    ["customer", "destination"]
  );
  doc.save(isSingle ? `${slugify(sections[0].title)}-auction-hall-report.pdf` : "auction-hall-report.pdf");
}

export function exportDestinationReportToPdf(destinations: DestinationReportGroup[]): void {
  const sections: ReportPdfSection[] = destinations.map((d) => ({
    title: d.destination,
    vehicles: d.vehicles,
  }));
  const isSingle = sections.length === 1;
  const doc = buildReportPdf(
    sections,
    isSingle ? `Destination Report — ${sections[0].title}` : "Destination Report",
    ["auctionHall", "customer"]
  );
  doc.save(isSingle ? `${slugify(sections[0].title)}-destination-report.pdf` : "destination-report.pdf");
}

export function exportFreightAgentReportToPdf(freightAgents: FreightAgentReportGroup[]): void {
  const sections: ReportPdfSection[] = freightAgents.map((a) => ({
    title: a.freightAgentName,
    vehicles: a.vehicles,
  }));
  const isSingle = sections.length === 1;
  const doc = buildReportPdf(
    sections,
    isSingle ? `Freight Agent Report — ${sections[0].title}` : "Freight Agent Report",
    ["customer", "shippingMethod"]
  );
  doc.save(isSingle ? `${slugify(sections[0].title)}-freight-agent-report.pdf` : "freight-agent-report.pdf");
}
