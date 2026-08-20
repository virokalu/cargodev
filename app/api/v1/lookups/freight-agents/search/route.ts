// GET /api/v1/lookups/freight-agents/search?q=&method=RORO|CONTAINER —
// filtered by name and, optionally, by shipping-method capability (only
// agents that offer the given method).

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { searchFreightAgents } from "@/lib/services/lookup.service";
import { freightAgentSearchQuerySchema, flattenFieldErrors } from "@/lib/validation/lookup.schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const parsed = freightAgentSearchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    method: request.nextUrl.searchParams.get("method") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const agents = await searchFreightAgents(auth.user.orgId, parsed.data.q, parsed.data.method);
    return apiSuccess(agents);
  } catch (error) {
    return apiError(error);
  }
}
