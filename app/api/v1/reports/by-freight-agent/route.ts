// GET /api/v1/reports/by-freight-agent — no track param, this report is
// FC-only by definition (see reports.service.ts).

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getFreightAgentVehicleReport } from "@/lib/services/reports.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const report = await getFreightAgentVehicleReport(auth.user.orgId);
    return apiSuccess(report);
  } catch (error) {
    return apiError(error);
  }
}
