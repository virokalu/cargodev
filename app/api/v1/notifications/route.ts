// GET /api/v1/notifications — always scoped to the authenticated user, not
// just their org (each user only ever sees their own notifications).

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listNotifications } from "@/lib/services/notification.service";
import { notificationListQuerySchema, flattenFieldErrors } from "@/lib/validation/notification.schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const parsed = notificationListQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const notifications = await listNotifications(auth.user.orgId, auth.user.id, parsed.data.limit);
    return apiSuccess(notifications);
  } catch (error) {
    return apiError(error);
  }
}
