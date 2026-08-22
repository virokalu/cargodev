// GET /api/v1/activity-log — Administrator only, matching CLAUDE.md's
// "change-order scope, Admin only" note for this screen.

import { NextRequest } from "next/server";
import type { StaffRole } from "@prisma/client";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listActivityLog } from "@/lib/services/activity-log.service";
import { activityLogListQuerySchema, flattenFieldErrors } from "@/lib/validation/activity-log.schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const STAFF_CAN_READ: StaffRole[] = ["ADMINISTRATOR"];

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request, STAFF_CAN_READ);
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const q = (key: string) => searchParams.get(key) ?? undefined;

  const parsed = activityLogListQuerySchema.safeParse({
    page: q("page"),
    pageSize: q("pageSize"),
    entity: q("entity"),
    entityId: q("entityId"),
    actorId: q("actorId"),
    action: q("action"),
    dateFrom: q("dateFrom"),
    dateTo: q("dateTo"),
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const log = await listActivityLog(auth.user.orgId, parsed.data);
    return apiSuccess(log);
  } catch (error) {
    return apiError(error);
  }
}
