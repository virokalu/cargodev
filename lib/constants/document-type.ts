// Shared VehicleDocumentType display metadata — one source of truth for the
// labels shown next to each typed document section (Add/Edit form's Files
// panel, the read-only detail page). OTHER is the pre-existing generic
// "Add Documents" bucket, kept for anything that doesn't fit the seven named
// types below.

import type { VehicleDocumentType } from "@prisma/client";

export const DOCUMENT_TYPE_META: Record<VehicleDocumentType, { label: string }> = {
  LC: { label: "Letter of Credit (LC)" },
  EC: { label: "Export Certificate (EC)" },
  ED: { label: "Export Declaration (ED)" },
  BL: { label: "Bill of Lading (BL)" },
  INSPECTION_REPORT: { label: "Inspection Report" },
  SHAKEN_SHO: { label: "Shaken-sho (車検証)" },
  FREIGHT_INVOICE: { label: "Freight Invoice" },
  OTHER: { label: "Other Documents" },
};

/** The seven named types, in the order they're shown — OTHER is rendered
 * separately by callers since it's the catch-all, not one of "the" types. */
export const NAMED_DOCUMENT_TYPES: VehicleDocumentType[] = [
  "LC",
  "EC",
  "ED",
  "BL",
  "INSPECTION_REPORT",
  "SHAKEN_SHO",
  "FREIGHT_INVOICE",
];
