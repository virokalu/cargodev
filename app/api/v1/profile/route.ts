// GET /api/v1/profile — the authenticated staff member's own profile.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getOwnProfile } from "@/lib/services/user.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const profile = await getOwnProfile(auth.user.orgId, auth.user.id);
    return apiSuccess(profile);
  } catch (error) {
    return apiError(error);
  }
}
