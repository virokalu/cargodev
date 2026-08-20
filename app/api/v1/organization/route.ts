import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getOrganizationName } from "@/lib/services/organization.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const name = await getOrganizationName(auth.user.orgId);
    return apiSuccess({ name });
  } catch (error) {
    return apiError(error);
  }
}
