import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/services/mobile-auth-guard";
import { getCustomerById } from "@/lib/services/customer.service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ServiceError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const customer = await getCustomerById(auth.user.orgId, id);
    if (!customer) {
      return apiError(new ServiceError("NOT_FOUND", "Customer not found."));
    }
    return apiSuccess(customer);
  } catch (error) {
    return apiError(error);
  }
}
