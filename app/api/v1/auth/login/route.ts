// Mobile login — issues an access+refresh token pair for a STAFF user.
// Unlike every other /api/v1 route, this one needs no bearer token: there
// isn't one yet, the email+password pair itself is the credential.

import { NextRequest } from "next/server";
import { loginMobile } from "@/lib/services/mobile-auth.service";
import { requestMetaFrom } from "@/lib/request-meta";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  try {
    const result = await loginMobile(body, requestMetaFrom(request));
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
