// POST/DELETE /api/v1/device-tokens — register or remove the calling
// device's Expo push token. userId/orgId always come from the verified
// bearer token, never from the request body — same rule as every other
// mobile route (see docs/mobile-api-reference.md's Field notes).

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { registerDeviceToken, unregisterDeviceToken } from "@/lib/services/device-token.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);

  try {
    const token = await registerDeviceToken(auth.user.orgId, auth.user.id, body);
    return apiSuccess(token);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);

  try {
    await unregisterDeviceToken(auth.user.orgId, auth.user.id, body);
    return apiSuccess({ unregistered: true });
  } catch (error) {
    return apiError(error);
  }
}
