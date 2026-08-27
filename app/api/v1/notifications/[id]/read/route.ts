// POST /api/v1/notifications/:id/read — mirrors the web app's
// markNotificationReadAction (app/(dashboard)/notifications/actions.ts).
// Idempotent: marking an already-read (or nonexistent/foreign) notification
// read just updates zero rows — markRead's compound org_id+userId+id where
// clause means a caller can never mark someone else's notification read by
// guessing an id, without needing a separate 404 lookup first.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { markRead } from "@/lib/services/notification.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    await markRead(auth.user.orgId, auth.user.id, id);
    return apiSuccess({ read: true });
  } catch (error) {
    return apiError(error);
  }
}
