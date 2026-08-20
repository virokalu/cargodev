// GET /api/v1/staff — Administrator/Manager only, matching the real gate on
// the web Users page (app/(dashboard)/users/page.tsx).

import { NextRequest } from "next/server";
import type { StaffRole } from "@prisma/client";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listStaff } from "@/lib/services/user.service";
import { staffListQuerySchema } from "@/lib/validation/user.schema";
import { flattenFieldErrors } from "@/lib/validation/shared";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const STAFF_CAN_READ: StaffRole[] = ["ADMINISTRATOR", "MANAGER"];

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request, STAFF_CAN_READ);
  if (!auth.ok) return auth.response;

  const parsed = staffListQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const staff = await listStaff(auth.user, parsed.data.q);
    return apiSuccess(staff);
  } catch (error) {
    return apiError(error);
  }
}
