// GET /api/v1/vehicles/:serial/files — auction sheet + photo + document
// URLs (plain public R2 URLs, not presigned — see lib/r2.ts's
// publicUrlForKey). Prefer this over pdf-images for a client that just
// needs to *display* files.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { resolveVehicleIdBySerial } from "@/lib/services/vehicle.service";
import { listVehicleFiles } from "@/lib/services/file.service";
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
    const files = await listVehicleFiles(auth.user.orgId, vehicleId);
    return apiSuccess(files);
  } catch (error) {
    return apiError(error);
  }
}
