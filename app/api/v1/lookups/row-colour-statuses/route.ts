// GET /api/v1/lookups/row-colour-statuses — admin-managed row colour
// definitions (name/hex colour/transportCellOnly). No search variant exists
// in the service layer — this is always the full list.

import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listRowColourStatuses } from "@/lib/services/lookup.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  try {
    const statuses = await listRowColourStatuses(auth.user.orgId);
    return apiSuccess(statuses);
  } catch (error) {
    return apiError(error);
  }
}
