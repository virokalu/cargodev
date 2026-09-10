// GET /api/v1/lookups/suppliers?q= — FL-only alternative to Auction Hall
// (Vehicle.auctionHallId and .supplierId are mutually exclusive).

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { searchSuppliers } from "@/lib/services/lookup.service";
import { lookupSearchQuerySchema, flattenFieldErrors } from "@/lib/validation/lookup.schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const parsed = lookupSearchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const suppliers = await searchSuppliers(auth.user.orgId, parsed.data.q);
    return apiSuccess(suppliers);
  } catch (error) {
    return apiError(error);
  }
}
