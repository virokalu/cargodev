// GET /api/v1/vehicles/:serial/status-history — chronological shipment
// status transitions (who/what triggered each change). Empty for FL
// vehicles (shipment status isn't tracked for FL at all).

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { resolveVehicleIdBySerial, listVehicleStatusHistory } from "@/lib/services/vehicle.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const { serial } = await params;

  try {
    const vehicleId = await resolveVehicleIdBySerial(auth.user.orgId, serial);
    const history = await listVehicleStatusHistory(auth.user.orgId, vehicleId);
    return apiSuccess(history);
  } catch (error) {
    return apiError(error);
  }
}
