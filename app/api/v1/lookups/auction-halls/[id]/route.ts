import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getAuctionHallById } from "@/lib/services/lookup.service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const hall = await getAuctionHallById(auth.user.orgId, id);
    if (!hall) {
      return apiError(new ServiceError("NOT_FOUND", "Auction hall not found."));
    }
    return apiSuccess(hall);
  } catch (error) {
    return apiError(error);
  }
}
