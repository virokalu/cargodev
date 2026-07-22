// Zod schema for vehicle creation — shape-level validation only.
//
// WHY shape-level only: this schema checks that fields are the right type and
// present when required. Rules that depend on the database (freight agent
// capabilities, FL fields being stripped, chassis duplicate warnings, customer
// must be userType CUSTOMER) can't be expressed here — they live in
// vehicle.service.ts, which has a Prisma client to check against.
//
// The client always sends date fields as "YYYY-MM-DD" strings (or null) since
// that's what a native <input type="date"> produces — optionalDate below
// turns that into a Date | null for Prisma.

import { z } from "zod";
import { flattenFieldErrors } from "@/lib/validation/shared";

export { flattenFieldErrors };

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const optionalText = (maxLength: number) =>
  z
    .string()
    .nullable()
    .optional()
    .transform(emptyToNull)
    .refine((v) => v === null || v.length <= maxLength, {
      message: `Must be ${maxLength} characters or fewer`,
    });

const optionalId = z.string().nullable().optional().transform(emptyToNull);

const optionalDate = z
  .string()
  .nullable()
  .optional()
  .transform(emptyToNull)
  .transform((v) => (v === null ? null : new Date(v)))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), {
    message: "Invalid date",
  });

// Tri-state flags: null = not entered, true = Yes, false = No.
// Never coerce a missing/undefined value to false — that's the whole point
// of these being nullable (see CLAUDE.md "Tri-state flags").
const triState = z
  .boolean()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

// Fields shared by create and edit — everything except serial/track (fixed at
// creation) and the legacy-entry-only fields (legacySerialNumber, the manual
// shipmentStatus override). Defined once so the two schemas below can't drift.
const vehicleSharedFields = {
  auctionItemNo: optionalText(100),
  chassisNo: z
    .string()
    .trim()
    .min(1, "Chassis number is required")
    .max(100, "Must be 100 characters or fewer"),

  brandId: z.string().min(1, "Make is required"),
  modelId: z.string().min(1, "Model is required"),
  gradeId: optionalId,

  yom: z
    .number()
    .int()
    .min(1980, "Enter a valid year")
    .max(new Date().getFullYear() + 1, "Enter a valid year")
    .nullable()
    .optional(),
  auctionHallId: optionalId,
  purchaseDate: optionalDate,
  auctionLotNo: optionalText(100),
  customerId: optionalId,
  destination: optionalText(100),

  // Shipment fields — FC only. Present in the schema so FC submissions
  // validate them, but vehicle.service strips them to null for FL regardless
  // of what's posted (never trust the client to have actually hidden them).
  etd: optionalDate,
  eta: optionalDate,
  blNo: optionalText(100),
  freightAgentId: optionalId,
  shippingMethod: z.enum(["RORO", "CONTAINER"]).nullable().optional(),
  trackingNo: optionalText(100),

  transportById: optionalId,
  vehicleLocationId: optionalId,
  massoDate: optionalDate,
  billNumber: optionalText(100),
  lcNo: optionalText(100),
  docsArrivedDate: optionalDate,

  auctionBillPaid: triState,
  logBook: triState,
  extraKey: triState,
  nameChangeDeadline: optionalDate,
  rowColourStatusId: optionalId,
  docSentDate: optionalDate,
  docSentComment: optionalText(500),
  recycleDate: optionalDate,
  jibaishake: optionalText(500),
};

/** Cross-field rules shared by create and edit. */
function checkSharedVehicleRules(
  data: {
    shippingMethod?: "RORO" | "CONTAINER" | null;
    freightAgentId?: string | null;
    etd?: Date | null;
    eta?: Date | null;
  },
  ctx: z.RefinementCtx
) {
  if (data.shippingMethod && !data.freightAgentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["freightAgentId"],
      message: "Select a freight agent before choosing RORO/Container",
    });
  }
  if (data.etd && data.eta && data.eta.getTime() <= data.etd.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["eta"],
      message: "ETA must be after ETD",
    });
  }
}

export const vehicleCreateSchema = z
  .object({
    track: z.enum(["FC", "FL"]),
    isLegacyEntry: z.boolean(),
    legacySerialNumber: z.number().int().positive().nullable().optional(),
    // Only honoured by the service when isLegacyEntry && track === "FC" —
    // otherwise status stays derived from ETD (Tech Doc §1).
    shipmentStatus: z.enum(["PENDING", "BOOKING_RECEIVED", "SHIPPED"]).nullable().optional(),

    ...vehicleSharedFields,
  })
  .superRefine((data, ctx) => {
    if (data.isLegacyEntry && !data.legacySerialNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legacySerialNumber"],
        message: "Enter the legacy serial number",
      });
    }
    checkSharedVehicleRules(data, ctx);
  });

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;

// Edit: no track/serial (read-only after creation, Tech Doc §3) and no manual
// shipmentStatus (that override is a creation-time-only exception — see
// vehicle.service.ts createVehicle/updateVehicle comments).
export const vehicleUpdateSchema = z.object(vehicleSharedFields).superRefine(checkSharedVehicleRules);

export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;

/** Flattens zod's nested error tree into one message per field, for form display. */
export function flattenFieldErrors(
  error: z.ZodError
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
