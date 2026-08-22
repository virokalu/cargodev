import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getDashboardTrends } from "@/lib/services/dashboard.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const trends = await getDashboardTrends(auth.user.orgId);
    return apiSuccess(trends);
  } catch (error) {
    return apiError(error);
  }
}
