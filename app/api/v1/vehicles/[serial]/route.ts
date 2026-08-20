// GET /api/v1/vehicles/:serial — full vehicle detail. Looked up by serial
// (unique per org, read-only after creation), same as the web detail page.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getVehicleDetail } from "@/lib/services/vehicle.service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const { serial } = await params;

  try {
    const vehicle = await getVehicleDetail(auth.user.orgId, serial);
    // getVehicleDetail returns null (not a ServiceError) for "not found" —
    // translate that into the standard 404 shape ourselves.
    if (!vehicle) {
      return apiError(new ServiceError("NOT_FOUND", "Vehicle not found."));
    }
    return apiSuccess(vehicle);
  } catch (error) {
    return apiError(error);
  }
}
