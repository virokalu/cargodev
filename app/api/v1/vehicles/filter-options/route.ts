// GET /api/v1/vehicles/filter-options — the fixed/enum option sets the
// vehicle list filter panel offers (track, shipment status, shipping
// method, tri-state/two-state values, sold currency) that aren't stored in
// the DB, so there's no other endpoint that exposes them. Searchable,
// DB-backed lookups (brand, model, grade, auction hall, supplier, freight
// agent, packing agent, vehicle location, transport company) stay on their
// own /api/v1/lookups/* endpoints instead — see getVehicleFilterOptions's
// own doc comment for why they're not folded in here too.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getVehicleFilterOptions } from "@/lib/services/vehicle.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const options = getVehicleFilterOptions();
    return apiSuccess(options);
  } catch (error) {
    return apiError(error);
  }
}
