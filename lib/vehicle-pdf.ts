// Client-side "Download PDF" for the vehicle detail page — mirrors every
// section of vehicle-detail-view.tsx (auction sheet, photos, the
// Information tab's field groups, the Shipment Timeline) except the
// Documents tab, which is deliberately left out. Same jsPDF + jspdf-
// autotable approach as lib/reports/export-pdf.ts (no server round trip for
// layout — the only server call is fetching the R2 image bytes, done ahead
// of time by the caller via fetchVehiclePdfImagesAction).
"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { SHIPMENT_STATUS_META } from "@/lib/constants/shipment-status";
import { isCancelShipmentRowColour } from "@/lib/shipment-status";
import { buildShipmentMilestones } from "@/lib/shipment-milestones";
import type { VehicleDetailData } from "@/lib/services/vehicle.service";
import type { VehiclePdfImages } from "@/lib/services/file.service";

// jspdf-autotable sets this on the doc instance after each call but doesn't
// type it — see node_modules/jspdf-autotable's runtime source (`jsPDFDoc.lastAutoTable`).
interface DocWithLastAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

const PAGE_MARGIN = 40;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "vehicle";
}

function triState(value: boolean | null): string {
  if (value === null) return "—";
  return value ? "Yes" : "No";
}

/** Builds a [label, value] row, formatting blank/null/undefined the same
 * way the on-screen <Field> component does — an em dash, never a blank cell
 * that reads as a rendering glitch. */
function field(label: string, value: string | number | null | undefined): [string, string] {
  const display = value === null || value === undefined || value === "" ? "—" : String(value);
  return [label, display];
}

function imageFormat(dataUrl: string): string {
  const match = /^data:image\/(\w+);/i.exec(dataUrl);
  const ext = match?.[1]?.toUpperCase() ?? "JPEG";
  return ext === "JPG" ? "JPEG" : ext;
}

function ensureSpace(doc: jsPDF, cursorY: number, needed: number, pageHeight: number): number {
  if (cursorY + needed > pageHeight - PAGE_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return cursorY;
}

function addSectionHeading(doc: jsPDF, text: string, y: number): void {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(text, PAGE_MARGIN, y);
  doc.setFont("helvetica", "normal");
}

/** A single [label, value] table, styled like every table in
 * lib/reports/export-pdf.ts so a PDF export reads the same regardless of
 * which screen it came from. Returns the Y position after the table. */
function addFieldTable(
  doc: DocWithLastAutoTable,
  title: string,
  rows: [string, string][],
  startY: number,
  pageHeight: number
): number {
  const y = ensureSpace(doc, startY, 40, pageHeight);
  addSectionHeading(doc, title, y);

  autoTable(doc, {
    startY: y + 8,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [["Field", "Value"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 170, fontStyle: "bold" } },
    theme: "grid",
  });

  return (doc.lastAutoTable?.finalY ?? y) + 24;
}

const THUMB_WIDTH = 150;
const THUMB_HEIGHT = 112;
const THUMB_GAP = 12;
const THUMBS_PER_ROW = 3;

/** Fits a grid of photos into the page, "contain"-style per thumbnail (each
 * image keeps its own aspect ratio inside a fixed cell instead of being
 * stretched) — a photo gallery has no fixed aspect ratio to design around,
 * unlike the auction sheet's single image. */
function addPhotoGrid(doc: jsPDF, dataUrls: string[], startY: number, pageHeight: number): number {
  let y = startY;
  for (let i = 0; i < dataUrls.length; i += THUMBS_PER_ROW) {
    y = ensureSpace(doc, y, THUMB_HEIGHT + THUMB_GAP, pageHeight);
    const row = dataUrls.slice(i, i + THUMBS_PER_ROW);
    row.forEach((dataUrl, col) => {
      const x = PAGE_MARGIN + col * (THUMB_WIDTH + THUMB_GAP);
      try {
        const props = doc.getImageProperties(dataUrl);
        const scale = Math.min(THUMB_WIDTH / props.width, THUMB_HEIGHT / props.height);
        const w = props.width * scale;
        const h = props.height * scale;
        doc.addImage(dataUrl, imageFormat(dataUrl), x + (THUMB_WIDTH - w) / 2, y + (THUMB_HEIGHT - h) / 2, w, h);
      } catch {
        // A single corrupt/undecodable image shouldn't sink the whole export.
        doc.setDrawColor(200);
        doc.rect(x, y, THUMB_WIDTH, THUMB_HEIGHT);
      }
    });
    y += THUMB_HEIGHT + THUMB_GAP;
  }
  return y + 12;
}

export function buildVehicleDetailPdf(
  vehicle: VehicleDetailData,
  ecReceivedAt: Date | null,
  images: VehiclePdfImages
): DocWithLastAutoTable {
  const isFC = vehicle.track === "FC";
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as DocWithLastAutoTable;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  const titleParts = [vehicle.brand?.name, vehicle.model?.name].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join(" ") : vehicle.serial;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, PAGE_MARGIN, PAGE_MARGIN);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  const subtitleParts = [vehicle.serial, vehicle.yom ? String(vehicle.yom) : null].filter(Boolean);
  doc.text(subtitleParts.join("  ·  "), PAGE_MARGIN, PAGE_MARGIN + 16);
  if (isFC) {
    doc.text(SHIPMENT_STATUS_META[vehicle.shipmentStatus].label, PAGE_MARGIN, PAGE_MARGIN + 30);
  }
  doc.setTextColor(150);
  doc.text(`Generated ${formatDate(new Date())}`, pageWidth - PAGE_MARGIN, PAGE_MARGIN, { align: "right" });
  doc.setTextColor(0);

  let y = PAGE_MARGIN + 50;

  // ── Auction Sheet ──────────────────────────────────────────────────────
  if (images.auctionSheetDataUrl) {
    y = ensureSpace(doc, y, 40, pageHeight);
    addSectionHeading(doc, "Auction Sheet", y);
    y += 10;
    try {
      const props = doc.getImageProperties(images.auctionSheetDataUrl);
      const maxWidth = 260;
      const maxHeight = 190;
      const scale = Math.min(maxWidth / props.width, maxHeight / props.height, 1);
      const w = props.width * scale;
      const h = props.height * scale;
      y = ensureSpace(doc, y, h, pageHeight);
      doc.addImage(images.auctionSheetDataUrl, imageFormat(images.auctionSheetDataUrl), PAGE_MARGIN, y, w, h);
      y += h + 20;
    } catch {
      // Skip a corrupt/undecodable auction sheet rather than failing the export.
    }
  }

  // ── Vehicle Photos ─────────────────────────────────────────────────────
  if (images.photoDataUrls.length > 0) {
    y = ensureSpace(doc, y, 40, pageHeight);
    addSectionHeading(doc, `Vehicle Photos (${images.photoDataUrls.length})`, y);
    y = addPhotoGrid(doc, images.photoDataUrls, y + 10, pageHeight);
  }

  // ── Vehicle Information ────────────────────────────────────────────────
  y = addFieldTable(
    doc,
    "Vehicle Information",
    [
      field("Chassis Number", vehicle.chassisNo),
      field("Make", vehicle.brand?.name),
      field("Model", vehicle.model?.name),
      field("Grade", vehicle.grade?.name),
      field("Year of Manufacture", vehicle.yom),
      field("Auction Hall", vehicle.auctionHall?.name),
      field("Purchase Date", formatDate(vehicle.purchaseDate)),
      field("Auction Lot No", vehicle.auctionLotNo),
      field("Customer", vehicle.customer?.name),
      field("Destination", vehicle.destination),
      field("Auction Bill Paid", triState(vehicle.auctionBillPaid)),
    ],
    y,
    pageHeight
  );

  // ── Shipment Details (FC only) ─────────────────────────────────────────
  if (isFC) {
    y = addFieldTable(
      doc,
      "Shipment Details",
      [
        field("ETD", formatDate(vehicle.etd)),
        field("ETA", formatDate(vehicle.eta)),
        field("BL No", vehicle.blNo),
        field("Forwarding Agent", vehicle.freightAgent?.name),
        field(
          "RORO / Container",
          vehicle.shippingMethod === "RORO" ? "RORO" : vehicle.shippingMethod === "CONTAINER" ? "Container" : null
        ),
        ...(vehicle.shippingMethod === "CONTAINER"
          ? ([field("Packing Agent", vehicle.packingAgent?.name)] as [string, string][])
          : []),
        field("Tracking No", vehicle.trackingNo),
        field("LC No", vehicle.lcNo),
      ],
      y,
      pageHeight
    );
  }

  // ── Transport & Logistics ──────────────────────────────────────────────
  y = addFieldTable(
    doc,
    "Transport & Logistics",
    [
      field("Transport By", vehicle.transportBy?.name),
      field("Vehicle Location", vehicle.vehicleLocation?.name),
      field("Docs Arrived Date", formatDate(vehicle.docsArrivedDate)),
      field("Name Change Deadline", formatDate(vehicle.nameChangeDeadline)),
      field("Extra Key", triState(vehicle.extraKey)),
      field("Log Book", triState(vehicle.logBook)),
      field("Masso Date", formatDate(vehicle.massoDate)),
      field("Doc Sent to Client", formatDate(vehicle.docSentDate)),
      field("Doc Sent Remark", vehicle.docSentComment),
    ],
    y,
    pageHeight
  );

  // ── Statuses & Flags ────────────────────────────────────────────────────
  y = addFieldTable(
    doc,
    "Statuses & Flags",
    [
      field("Row Colour Status", vehicle.rowColourStatus?.name),
      field("Recycle Date", formatDate(vehicle.recycleDate)),
      field("Jibaishake (自賠責)", vehicle.jibaishake),
    ],
    y,
    pageHeight
  );

  // ── Shipment Timeline (FC only) — same milestone logic as the on-screen
  // panel, including the "deal fell through" cancelled state. ────────────
  if (isFC) {
    const cancelledRowColour =
      vehicle.rowColourStatus && isCancelShipmentRowColour(vehicle.rowColourStatus.name)
        ? vehicle.rowColourStatus
        : null;

    y = ensureSpace(doc, y, 40, pageHeight);
    addSectionHeading(doc, "Shipment Timeline", y);

    if (cancelledRowColour) {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `${cancelledRowColour.name} — shipment tracking milestones no longer apply to this vehicle.`,
        PAGE_MARGIN,
        y + 16
      );
      doc.setTextColor(0);
      y += 34;
    } else {
      const milestones = buildShipmentMilestones({
        auctionBillPaid: vehicle.auctionBillPaid,
        transportBy: vehicle.transportBy,
        lcNo: vehicle.lcNo,
        etd: vehicle.etd,
        eta: vehicle.eta,
        destination: vehicle.destination,
        ecReceivedAt,
      });
      autoTable(doc, {
        startY: y + 8,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [["Milestone", "Date", "Status"]],
        body: milestones.map((m) => [m.label, formatDate(m.date), m.completed ? "Done" : "Pending"]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [241, 245, 249], textColor: 30, fontStyle: "bold" },
        theme: "grid",
      });
      y = (doc.lastAutoTable?.finalY ?? y) + 24;
    }
  }

  // ── Notes ────────────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 40, pageHeight);
  addSectionHeading(doc, "Notes", y);
  doc.setFontSize(9);
  const noteText = vehicle.vehicleRemark?.trim() || "No remarks recorded.";
  if (!vehicle.vehicleRemark?.trim()) doc.setTextColor(150);
  const wrapped = doc.splitTextToSize(noteText, pageWidth - PAGE_MARGIN * 2);
  y = ensureSpace(doc, y, 14 + wrapped.length * 12, pageHeight);
  doc.text(wrapped, PAGE_MARGIN, y + 16);
  doc.setTextColor(0);

  // ── Footer — page numbers ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 16, { align: "right" });
  }

  return doc;
}

export function exportVehicleDetailToPdf(
  vehicle: VehicleDetailData,
  ecReceivedAt: Date | null,
  images: VehiclePdfImages
): void {
  const doc = buildVehicleDetailPdf(vehicle, ecReceivedAt, images);
  doc.save(`${slugify(vehicle.serial)}-detail.pdf`);
}
