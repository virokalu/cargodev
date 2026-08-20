import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getFreightAgentById } from "@/lib/services/lookup.service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const agent = await getFreightAgentById(auth.user.orgId, id);
    if (!agent) {
      return apiError(new ServiceError("NOT_FOUND", "Freight agent not found."));
    }
    return apiSuccess(agent);
  } catch (error) {
    return apiError(error);
  }
}
