import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { searchGrades } from "@/lib/services/lookup.service";
import { gradeSearchQuerySchema, flattenFieldErrors } from "@/lib/validation/lookup.schema";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const parsed = gradeSearchQuerySchema.safeParse({
    modelId: request.nextUrl.searchParams.get("modelId") ?? undefined,
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const grades = await searchGrades(auth.user.orgId, parsed.data.modelId, parsed.data.q);
    return apiSuccess(grades);
  } catch (error) {
    return apiError(error);
  }
}
