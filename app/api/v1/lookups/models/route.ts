import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { searchModels } from "@/lib/services/lookup.service";
import { modelSearchQuerySchema, flattenFieldErrors } from "@/lib/validation/lookup.schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const parsed = modelSearchQuerySchema.safeParse({
    brandId: request.nextUrl.searchParams.get("brandId") ?? undefined,
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const models = await searchModels(auth.user.orgId, parsed.data.brandId, parsed.data.q);
    return apiSuccess(models);
  } catch (error) {
    return apiError(error);
  }
}
