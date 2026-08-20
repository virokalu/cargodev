import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const stats = await getDashboardStats(auth.user.orgId);
    return apiSuccess(stats);
  } catch (error) {
    return apiError(error);
  }
}
