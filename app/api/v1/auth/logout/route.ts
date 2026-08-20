// Mobile logout — revokes the given refresh token so it can no longer be
// used to mint new access tokens. Idempotent: an already-revoked or
// unknown token is treated the same as a successful logout.

import { NextRequest } from "next/server";
import { logoutMobile } from "@/lib/services/mobile-auth.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  try {
    await logoutMobile(body);
    return apiSuccess({ loggedOut: true });
  } catch (error) {
    return apiError(error);
  }
}
