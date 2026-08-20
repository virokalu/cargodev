// Query schema for GET /api/v1/activity-log (Administrator-only).

import { z } from "zod";
import { flattenFieldErrors } from "@/lib/validation/shared";

export { flattenFieldErrors };

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalDate = z
  .string()
  .optional()
  .transform(emptyToUndefined)
  .transform((v) => (v === undefined ? undefined : new Date(v)))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), { message: "Invalid date" });

export const activityLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  entity: z.string().trim().max(100).optional().transform(emptyToUndefined),
  entityId: z.string().trim().max(100).optional().transform(emptyToUndefined),
  actorId: z.string().trim().max(100).optional().transform(emptyToUndefined),
  action: z.string().trim().max(100).optional().transform(emptyToUndefined),
  dateFrom: optionalDate,
  dateTo: optionalDate,
});
