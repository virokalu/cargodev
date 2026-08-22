// Query schema for GET /api/v1/notifications.

import { z } from "zod";
import { flattenFieldErrors } from "@/lib/validation/shared";

export { flattenFieldErrors };

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
