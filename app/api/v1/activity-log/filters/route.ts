// GET /api/v1/activity-log/filters — Administrator only, same gate as the
// log itself. Distinct entity/action values actually present in this org's
// log, for building a filter dropdown before calling GET /activity-log.

import { NextRequest } from "next/server";
import type { StaffRole } from "@prisma/client";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listActivityLogFilterOptions } from "@/lib/services/activity-log.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const STAFF_CAN_READ: StaffRole[] = ["ADMINISTRATOR"];

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request, STAFF_CAN_READ);
  if (!auth.ok) return auth.response;

  try {
    const options = await listActivityLogFilterOptions(auth.user.orgId);
    return apiSuccess(options);
  } catch (error) {
    return apiError(error);
  }
}
