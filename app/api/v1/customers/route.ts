import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { listCustomers } from "@/lib/services/customer.service";
import { customerListQuerySchema } from "@/lib/validation/customer.schema";
import { flattenFieldErrors } from "@/lib/validation/shared";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const parsed = customerListQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(new ServiceError("VALIDATION", "Invalid query parameters.", flattenFieldErrors(parsed.error)));
  }

  try {
    const customers = await listCustomers(auth.user.orgId, parsed.data.q);
    return apiSuccess(customers);
  } catch (error) {
    return apiError(error);
  }
}
