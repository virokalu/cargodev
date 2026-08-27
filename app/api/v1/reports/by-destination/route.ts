import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getDestinationVehicleReport } from "@/lib/services/reports.service";
import { reportTrackQuerySchema, flattenFieldErrors } from "@/lib/validation/report.schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const parsed = reportTrackQuerySchema.safeParse({
    track: request.nextUrl.searchParams.get("track") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const report = await getDestinationVehicleReport(auth.user.orgId, parsed.data.track);
    return apiSuccess(report);
  } catch (error) {
    return apiError(error);
  }
}
