// GET /api/v1/vehicles — paginated, filtered vehicle list. Query params
// mirror the web filter bar (lib/vehicle-list-url.ts) — see
// vehicleListQuerySchema for the exact shape and defaults.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listVehicles } from "@/lib/services/vehicle.service";
import { vehicleListQuerySchema, flattenFieldErrors } from "@/lib/validation/vehicle.schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const q = (key: string) => searchParams.get(key) ?? undefined;

  const raw = {
    page: q("page"),
    pageSize: q("pageSize"),
    track: q("track"),
    q: q("q"),
    status: searchParams.getAll("status"),
    destination: q("destination"),
    customer: q("customer"),
    rowColour: q("rowColour"),
    rowColourNot: q("rowColourNot"),
    brand: q("brand"),
    model: q("model"),
    grade: q("grade"),
    hall: q("hall"),
    supplier: q("supplier"),
    agent: q("agent"),
    packingAgent: q("packingAgent"),
    location: q("location"),
    transport: q("transport"),
    method: q("method"),
    billPaid: q("billPaid"),
    logBook: q("logBook"),
    extraKey: q("extraKey"),
    partnership: q("partnership"),
    paidByCustomer: q("paidByCustomer"),
    currency: q("currency"),
    converted: q("converted"),
    sort: q("sort"),
    dir: q("dir"),
  };

  const parsed = vehicleListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(
      new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error))
    );
  }

  try {
    const result = await listVehicles(auth.user.orgId, parsed.data);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
