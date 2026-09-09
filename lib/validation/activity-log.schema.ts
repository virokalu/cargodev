// Query schema for GET /api/v1/activity-log (Administrator-only).

import { z } from "zod";
import { flattenFieldErrors } from "@/lib/validation/shared";
import { paginationQuerySchema } from "@/lib/validation/pagination.schema";

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
  ...paginationQuerySchema.shape,
  // entity/action are partial, case-insensitive matches (like every other
  // free-text filter in this API) — a client can't know the exact stored
  // string without a fixed enum backing it, so exact-match would be
  // unusable without first calling GET /activity-log/filters. entityId/
  // actorId stay exact: those are real ids, not searchable text.
  entity: z.string().trim().max(100).optional().transform(emptyToUndefined),
  entityId: z.string().trim().max(100).optional().transform(emptyToUndefined),
  actorId: z.string().trim().max(100).optional().transform(emptyToUndefined),
  action: z.string().trim().max(100).optional().transform(emptyToUndefined),
  dateFrom: optionalDate,
  dateTo: optionalDate,
});
