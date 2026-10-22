// Client-side "Download PDF" for the vehicle detail page — mirrors every
// section of vehicle-detail-view.tsx (auction sheet, photos, the
// Information tab's field groups, the Shipment Timeline) except the
// Documents tab, which is deliberately left out. Same jsPDF + jspdf-
// autotable approach as lib/reports/export-pdf.ts (no server round trip for
// layout — the only server call is fetching the R2 image bytes, done ahead
// of time by the caller via fetchVehiclePdfImagesAction).
//
// `selectedFieldIds` (lib/vehicle-pdf-fields.ts's PdfFieldId) lets the
// caller's field-selection modal (components/vehicles/pdf-field-selection-
// dialog.tsx) omit individual fields or whole sections — a section whose
// every field is unticked is skipped entirely rather than rendered with an
// empty table under its heading.
"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { SHIPMENT_STATUS_META } from "@/lib/constants/shipment-status";
import { isCancelShipmentRowColour } from "@/lib/shipment-status";
import { buildShipmentMilestones, LC_OPEN_DESTINATIONS } from "@/lib/shipment-milestones";
import type { VehicleDetailData } from "@/lib/services/vehicle.service";
import type { VehiclePdfImages } from "@/lib/services/file.service";
import type { PdfFieldId } from "@/lib/vehicle-pdf-fields";

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

/** Same as field(), but returns null when the caller's field-selection
 * modal has this id unticked — pair with filterFields() to drop it from
 * the table entirely rather than rendering an unwanted row. Takes the id as
 * a PdfFieldId (the union exported by lib/vehicle-pdf-fields.ts, not a bare
 * string) so a typo'd id fails to compile instead of silently never
 * matching a checkbox. */
function selectableField(
  selectedFieldIds: Set<PdfFieldId>,
  id: PdfFieldId,
  label: string,
  value: string | number | null | undefined
): [string, string] | null {
  return selectedFieldIds.has(id) ? field(label, value) : null;
}

/** Drops the nulls selectableField() produces for unticked fields. */
function filterFields(rows: ([string, string] | null)[]): [string, string][] {
  return rows.filter((row): row is [string, string] => row !== null);
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
  inspectionCompletedAt: Date | null,
  images: VehiclePdfImages,
  selectedFieldIds: Set<PdfFieldId>
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
  if (images.auctionSheetDataUrl && selectedFieldIds.has("auctionSheetImage")) {
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
  if (images.photoDataUrls.length > 0 && selectedFieldIds.has("vehiclePhotosGrid")) {
    y = ensureSpace(doc, y, 40, pageHeight);
    addSectionHeading(doc, `Vehicle Photos (${images.photoDataUrls.length})`, y);
    y = addPhotoGrid(doc, images.photoDataUrls, y + 10, pageHeight);
  }

  // ── Vehicle Information ────────────────────────────────────────────────
  // Supplier/Partnership only ever apply to FL vehicles — same gating as
  // the on-screen Information tab (vehicle-detail-view.tsx).
  const vehicleInformationRows = filterFields([
    selectableField(selectedFieldIds, "chassisNo", "Chassis Number", vehicle.chassisNo),
    selectableField(selectedFieldIds, "make", "Make", vehicle.brand?.name),
    selectableField(selectedFieldIds, "model", "Model", vehicle.model?.name),
    selectableField(selectedFieldIds, "grade", "Grade", vehicle.grade?.name),
    selectableField(selectedFieldIds, "yom", "Year of Manufacture", vehicle.yom),
    selectableField(selectedFieldIds, "auctionHall", "Auction Hall", vehicle.auctionHall?.name),
    ...(!isFC ? [selectableField(selectedFieldIds, "supplier", "Supplier", vehicle.supplier?.name)] : []),
    selectableField(selectedFieldIds, "purchaseDate", "Purchase Date", formatDate(vehicle.purchaseDate)),
    selectableField(selectedFieldIds, "auctionLotNo", "Auction Lot No", vehicle.auctionLotNo),
    selectableField(selectedFieldIds, "customer", "Customer", vehicle.customer?.name),
    selectableField(selectedFieldIds, "destination", "Destination", vehicle.destination),
    ...(!isFC
      ? [
          selectableField(
            selectedFieldIds,
            "partnership",
            "Partnership",
            vehicle.hasPartnership ? vehicle.partnerName : "No"
          ),
        ]
      : []),
    selectableField(selectedFieldIds, "auctionBillPaid", "Auction Bill Paid", triState(vehicle.auctionBillPaid)),
  ]);
  if (vehicleInformationRows.length > 0) {
    y = addFieldTable(doc, "Vehicle Information", vehicleInformationRows, y, pageHeight);
  }

  // ── Shipment Details (FC only) ─────────────────────────────────────────
  if (isFC) {
    const isContainer = vehicle.shippingMethod === "CONTAINER";
    const lcOpen = LC_OPEN_DESTINATIONS.has(vehicle.destination ?? "");
    const shipmentDetailsRows = filterFields([
      selectableField(selectedFieldIds, "etd", "ETD", formatDate(vehicle.etd)),
      selectableField(selectedFieldIds, "eta", "ETA", formatDate(vehicle.eta)),
      selectableField(selectedFieldIds, "blNo", "BL No", vehicle.blNo),
      selectableField(selectedFieldIds, "vesselName", "Vessel Name", vehicle.vesselName),
      selectableField(selectedFieldIds, "freightAgent", "Forwarding Agent", vehicle.freightAgent?.name),
      selectableField(
        selectedFieldIds,
        "shippingMethod",
        "RORO / Container",
        vehicle.shippingMethod === "RORO" ? "RORO" : vehicle.shippingMethod === "CONTAINER" ? "Container" : null
      ),
      ...(isContainer
        ? [
            selectableField(selectedFieldIds, "containerNumber", "Container Number", vehicle.containerNumber),
            selectableField(selectedFieldIds, "packingAgent", "Packing Agent", vehicle.packingAgent?.name),
            selectableField(selectedFieldIds, "vanningDate", "Vanning Date", formatDate(vehicle.vanningDate)),
          ]
        : []),
      ...(lcOpen ? [selectableField(selectedFieldIds, "lcNo", "LC No", vehicle.lcNo)] : []),
      selectableField(selectedFieldIds, "inspection", "Inspection", vehicle.hasInspection ? "Yes" : "No"),
      ...(vehicle.hasInspection
        ? [
            selectableField(selectedFieldIds, "inspectionDate", "Inspection Date", formatDate(vehicle.inspectionDate)),
            selectableField(selectedFieldIds, "inspectionCompany", "Inspection Company", vehicle.inspectionCompany?.name),
            selectableField(selectedFieldIds, "inspectionBy", "Inspection By", vehicle.inspectionBy?.name),
          ]
        : []),
    ]);
    if (shipmentDetailsRows.length > 0) {
      y = addFieldTable(doc, "Shipment Details", shipmentDetailsRows, y, pageHeight);
    }
  }

  // ── Transport & Logistics ──────────────────────────────────────────────
  const transportLogisticsRows = filterFields([
    selectableField(selectedFieldIds, "transportBy", "Transport By", vehicle.transportBy?.name),
    selectableField(selectedFieldIds, "vehicleLocation", "Vehicle Location", vehicle.vehicleLocation?.name),
    selectableField(selectedFieldIds, "trackingNumber", "Tracking Number", vehicle.trackingNumber),
    selectableField(selectedFieldIds, "docsArrivedDate", "Docs Arrived Date", formatDate(vehicle.docsArrivedDate)),
    selectableField(selectedFieldIds, "nameChangeDeadline", "Name Change Deadline", formatDate(vehicle.nameChangeDeadline)),
    selectableField(selectedFieldIds, "extraKey", "Extra Key", triState(vehicle.extraKey)),
    selectableField(selectedFieldIds, "logBook", "Log Book", triState(vehicle.logBook)),
    selectableField(selectedFieldIds, "massoDate", "Masso Date", formatDate(vehicle.massoDate)),
    selectableField(selectedFieldIds, "docSentDate", "Doc Sent to Client", formatDate(vehicle.docSentDate)),
    selectableField(selectedFieldIds, "docSentComment", "Doc Sent Remark", vehicle.docSentComment),
  ]);
  if (transportLogisticsRows.length > 0) {
    y = addFieldTable(doc, "Transport & Logistics", transportLogisticsRows, y, pageHeight);
  }

  // ── Sale Details (FL only) — mirrors the on-screen Information tab's own
  // FL-only "Sale Details" group, not previously included in this PDF. ───
  if (!isFC) {
    const saleDetailsRows = filterFields([
      selectableField(selectedFieldIds, "deliveryDate", "Delivery Date", formatDate(vehicle.deliveryDate)),
      selectableField(selectedFieldIds, "paidByCustomer", "Paid by Customer", triState(vehicle.paidByCustomer)),
      selectableField(
        selectedFieldIds,
        "sellingPrice",
        "Selling Price",
        vehicle.sellingPrice === null
          ? null
          : `${vehicle.sellingPrice.toLocaleString()} ${vehicle.sellingPriceCurrency ?? ""}`.trim()
      ),
    ]);
    if (saleDetailsRows.length > 0) {
      y = addFieldTable(doc, "Sale Details", saleDetailsRows, y, pageHeight);
    }
  }

  // ── Statuses & Flags ────────────────────────────────────────────────────
  const statusesFlagsRows = filterFields([
    selectableField(selectedFieldIds, "rowColourStatus", "Row Colour Status", vehicle.rowColourStatus?.name),
    selectableField(selectedFieldIds, "recycleDate", "Recycle Date", formatDate(vehicle.recycleDate)),
    selectableField(selectedFieldIds, "jibaishake", "Jibaishake (自賠責)", vehicle.jibaishake),
  ]);
  if (statusesFlagsRows.length > 0) {
    y = addFieldTable(doc, "Statuses & Flags", statusesFlagsRows, y, pageHeight);
  }

  // ── Shipment Timeline (FC only) — same milestone logic as the on-screen
  // panel, including the "deal fell through" cancelled state. ────────────
  if (isFC && selectedFieldIds.has("shipmentTimeline")) {
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
        bookingReceivedAt: vehicle.bookingReceivedAt,
        eta: vehicle.eta,
        destination: vehicle.destination,
        ecReceivedAt,
        inspectionCompletedAt,
        shippingMethod: vehicle.shippingMethod,
        vanningDate: vehicle.vanningDate,
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
  if (selectedFieldIds.has("notes")) {
    y = ensureSpace(doc, y, 40, pageHeight);
    addSectionHeading(doc, "Notes", y);
    doc.setFontSize(9);
    const noteText = vehicle.vehicleRemark?.trim() || "No remarks recorded.";
    if (!vehicle.vehicleRemark?.trim()) doc.setTextColor(150);
    const wrapped = doc.splitTextToSize(noteText, pageWidth - PAGE_MARGIN * 2);
    y = ensureSpace(doc, y, 14 + wrapped.length * 12, pageHeight);
    doc.text(wrapped, PAGE_MARGIN, y + 16);
    doc.setTextColor(0);
  }

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
  inspectionCompletedAt: Date | null,
  images: VehiclePdfImages,
  selectedFieldIds: Set<PdfFieldId>
): void {
  const doc = buildVehicleDetailPdf(vehicle, ecReceivedAt, inspectionCompletedAt, images, selectedFieldIds);
  doc.save(`${slugify(vehicle.serial)}-detail.pdf`);
}
