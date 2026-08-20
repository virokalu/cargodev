// Mobile token refresh — trades a still-valid refresh token for a new
// access+refresh pair (rotation: the old refresh token is revoked in the
// same transaction the new one is created). The raw refresh token itself
// proves ownership, so this route needs no bearer access token either.

import { NextRequest } from "next/server";
import { refreshMobileToken } from "@/lib/services/mobile-auth.service";
import { requestMetaFrom } from "@/lib/request-meta";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  try {
    const result = await refreshMobileToken(body, requestMetaFrom(request));
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
