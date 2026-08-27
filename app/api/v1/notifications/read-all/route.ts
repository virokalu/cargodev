// POST /api/v1/notifications/read-all — mirrors the web app's
// markAllNotificationsReadAction. Always scoped to the calling user; there's
// no way to mark another user's notifications read.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { markAllRead } from "@/lib/services/notification.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    await markAllRead(auth.user.orgId, auth.user.id);
    return apiSuccess({ read: true });
  } catch (error) {
    return apiError(error);
  }
}
