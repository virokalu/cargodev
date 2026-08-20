// GET /api/v1/lookups/freight-agents — every freight agent, with RORO/
// Container capability flags. Use ?q=&method= via /search for a filtered
// combobox-style lookup instead.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listFreightAgents } from "@/lib/services/lookup.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const agents = await listFreightAgents(auth.user.orgId);
    return apiSuccess(agents);
  } catch (error) {
    return apiError(error);
  }
}
