// GET /api/v1/vehicles/destinations — distinct destination country list,
// used to populate a filter dropdown.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listDistinctDestinations } from "@/lib/services/vehicle.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const destinations = await listDistinctDestinations(auth.user.orgId);
    return apiSuccess(destinations);
  } catch (error) {
    return apiError(error);
  }
}
