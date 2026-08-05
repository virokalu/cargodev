// Zod schema for the /api/uploads/presign request body — shape-level plus
// per-kind MIME/size limits (US-24: images ≤10MB JPEG/PNG/WebP). No cap is
// specified anywhere for documents; 20MB is a judgment call sized for
// scanned B/L/invoice bundles, not an acceptance criterion.

import { z } from "zod";
import { flattenFieldErrors } from "@/lib/validation/shared";

export { flattenFieldErrors };

export const UPLOAD_LIMITS = {
  AUCTION_SHEET: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024 },
  VEHICLE_PHOTO: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024 },
  VEHICLE_DOCUMENT: { mimeTypes: ["application/pdf"], maxBytes: 20 * 1024 * 1024 },
} as const;

export const presignRequestSchema = z
  .object({
    // Omitted only for AUCTION_SHEET during vehicle creation — no vehicle
    // row exists yet to check ownership against.
    vehicleId: z.string().min(1).optional(),
    kind: z.enum(["AUCTION_SHEET", "VEHICLE_PHOTO", "VEHICLE_DOCUMENT"]),
    fileName: z.string().min(1).max(255),
    contentType: z.string().min(1),
    fileSize: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (data.kind !== "AUCTION_SHEET" && !data.vehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vehicleId"],
        message: "vehicleId is required.",
      });
    }
    const rule = UPLOAD_LIMITS[data.kind];
    if (!rule.mimeTypes.includes(data.contentType as never)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentType"],
        message: "Unsupported file type.",
      });
    }
    if (data.fileSize > rule.maxBytes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fileSize"],
        message: `Must be ${rule.maxBytes / 1024 / 1024} MB or smaller.`,
      });
    }
  });

export type PresignRequest = z.infer<typeof presignRequestSchema>;
