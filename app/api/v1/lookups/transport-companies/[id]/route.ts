import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getTransportCompanyById } from "@/lib/services/lookup.service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const company = await getTransportCompanyById(auth.user.orgId, id);
    if (!company) {
      return apiError(new ServiceError("NOT_FOUND", "Transport company not found."));
    }
    return apiSuccess(company);
  } catch (error) {
    return apiError(error);
  }
}
