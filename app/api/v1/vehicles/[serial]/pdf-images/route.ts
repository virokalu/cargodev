// GET /api/v1/vehicles/:serial/pdf-images — auction sheet + every photo
// inlined as base64 data URLs (can be several MB per vehicle). Included for
// parity with the web app's PDF export, but a client that just needs to
// *display* images should prefer /files instead, which returns plain URLs.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { resolveVehicleIdBySerial } from "@/lib/services/vehicle.service";
import { getVehiclePdfImages } from "@/lib/services/file.service";
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
    const images = await getVehiclePdfImages(auth.user.orgId, vehicleId);
    return apiSuccess(images);
  } catch (error) {
    return apiError(error);
  }
}
