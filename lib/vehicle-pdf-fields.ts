// Shared field/section registry for the vehicle detail PDF's field-selection
// modal (components/vehicles/pdf-field-selection-dialog.tsx) and the PDF
// builder itself (lib/vehicle-pdf.ts). One list, two consumers — so a field
// id can never drift out of sync between "what the checkbox says it is" and
// "what the PDF actually checks for". No "use client": this is plain data,
// safe to import from either a client component or vehicle-pdf.ts.
//
// Every section/field and its gating condition mirrors
// components/vehicles/vehicle-detail-view.tsx's Information tab exactly
// (isFC, shippingMethod === "CONTAINER", LC_OPEN_DESTINATIONS, hasInspection)
// — a field only ever appears as a checkbox when it would actually have
// something to show for this vehicle. Documents tab stays out of scope,
// same as it already deliberately is in vehicle-pdf.ts.

import { LC_OPEN_DESTINATIONS } from "@/lib/shipment-milestones";
import type { VehicleDetailData } from "@/lib/services/vehicle.service";

export interface PdfFieldDef {
  id: PdfFieldId;
  label: string;
}

export interface PdfSectionDef {
  id: string;
  title: string;
  fields: PdfFieldDef[];
}

// Every field id the registry can ever produce — kept as a union (not just
// `string`) so lib/vehicle-pdf.ts's selectableField() gets a compile error
// on a typo'd id instead of it silently never matching.
export type PdfFieldId =
  | "auctionSheetImage"
  | "vehiclePhotosGrid"
  | "chassisNo"
  | "make"
  | "model"
  | "grade"
  | "yom"
  | "auctionHall"
  | "supplier"
  | "purchaseDate"
  | "auctionLotNo"
  | "customer"
  | "destination"
  | "partnership"
  | "auctionBillPaid"
  | "transportBy"
  | "vehicleLocation"
  | "trackingNumber"
  | "docsArrivedDate"
  | "nameChangeDeadline"
  | "extraKey"
  | "logBook"
  | "massoDate"
  | "docSentDate"
  | "docSentComment"
  | "etd"
  | "eta"
  | "blNo"
  | "vesselName"
  | "freightAgent"
  | "shippingMethod"
  | "containerNumber"
  | "packingAgent"
  | "vanningDate"
  | "lcNo"
  | "inspection"
  | "inspectionDate"
  | "inspectionCompany"
  | "inspectionBy"
  | "deliveryDate"
  | "paidByCustomer"
  | "sellingPrice"
  | "rowColourStatus"
  | "recycleDate"
  | "jibaishake"
  | "shipmentTimeline"
  | "notes";

function f(id: PdfFieldId, label: string): PdfFieldDef {
  return { id, label };
}

/** The sections/fields applicable to this specific vehicle, in the same
 * order the PDF renders them — a section with no applicable fields (e.g.
 * "Sale Details" on an FC vehicle) is simply left out, never shown as an
 * empty group in the modal. */
export function getPdfFieldSections(vehicle: VehicleDetailData): PdfSectionDef[] {
  const isFC = vehicle.track === "FC";
  const isContainer = vehicle.shippingMethod === "CONTAINER";
  const lcOpen = LC_OPEN_DESTINATIONS.has(vehicle.destination ?? "");

  const sections: PdfSectionDef[] = [
    { id: "auctionSheet", title: "Auction Sheet", fields: [f("auctionSheetImage", "Auction Sheet Image")] },
    { id: "vehiclePhotos", title: "Vehicle Photos", fields: [f("vehiclePhotosGrid", "Vehicle Photos")] },
    {
      id: "vehicleInformation",
      title: "Vehicle Information",
      fields: [
        f("chassisNo", "Chassis Number"),
        f("make", "Make"),
        f("model", "Model"),
        f("grade", "Grade"),
        f("yom", "Year of Manufacture"),
        f("auctionHall", "Auction Hall"),
        ...(!isFC ? [f("supplier", "Supplier")] : []),
        f("purchaseDate", "Purchase Date"),
        f("auctionLotNo", "Auction Lot No"),
        f("customer", "Customer"),
        f("destination", "Destination"),
        ...(!isFC ? [f("partnership", "Partnership")] : []),
        f("auctionBillPaid", "Auction Bill Paid"),
      ],
    },
    {
      id: "transportLogistics",
      title: "Transport & Logistics",
      fields: [
        f("transportBy", "Transport By"),
        f("vehicleLocation", "Vehicle Location"),
        f("trackingNumber", "Tracking Number"),
        f("docsArrivedDate", "Docs Arrived Date"),
        f("nameChangeDeadline", "Name Change Deadline"),
        f("extraKey", "Extra Key"),
        f("logBook", "Log Book"),
        f("massoDate", "Masso Date"),
        f("docSentDate", "Doc Sent to Client"),
        f("docSentComment", "Doc Sent Remark"),
      ],
    },
  ];

  if (isFC) {
    sections.push({
      id: "shipmentDetails",
      title: "Shipment Details",
      fields: [
        f("etd", "ETD"),
        f("eta", "ETA"),
        f("blNo", "BL No"),
        f("vesselName", "Vessel Name"),
        f("freightAgent", "Forwarding Agent"),
        f("shippingMethod", "RORO / Container"),
        ...(isContainer
          ? [f("containerNumber", "Container Number"), f("packingAgent", "Packing Agent"), f("vanningDate", "Vanning Date")]
          : []),
        ...(lcOpen ? [f("lcNo", "LC No")] : []),
        f("inspection", "Inspection"),
        ...(vehicle.hasInspection
          ? [f("inspectionDate", "Inspection Date"), f("inspectionCompany", "Inspection Company"), f("inspectionBy", "Inspection By")]
          : []),
      ],
    });
  } else {
    sections.push({
      id: "saleDetails",
      title: "Sale Details",
      fields: [f("deliveryDate", "Delivery Date"), f("paidByCustomer", "Paid by Customer"), f("sellingPrice", "Selling Price")],
    });
  }

  sections.push({
    id: "statusesFlags",
    title: "Statuses & Flags",
    fields: [f("rowColourStatus", "Row Colour Status"), f("recycleDate", "Recycle Date"), f("jibaishake", "Jibaishake (自賠責)")],
  });

  if (isFC) {
    sections.push({ id: "shipmentTimeline", title: "Shipment Timeline", fields: [f("shipmentTimeline", "Shipment Timeline")] });
  }

  sections.push({ id: "notes", title: "Notes", fields: [f("notes", "Notes")] });

  return sections;
}

/** Every field id across the given sections — used to default the dialog to
 * "everything selected" when it opens. */
export function allPdfFieldIds(sections: PdfSectionDef[]): PdfFieldId[] {
  return sections.flatMap((section) => section.fields.map((field) => field.id));
}
