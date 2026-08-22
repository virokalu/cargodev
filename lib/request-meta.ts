// Pulls client IP/user-agent out of a NextRequest for audit-trail purposes
// (RefreshToken.createdByIp/userAgent) only — never used for a security
// decision. Kept out of lib/services/mobile-auth.service.ts so the service
// layer stays framework-free (CLAUDE.md rule 2).

import type { NextRequest } from "next/server";
import type { RequestMeta } from "@/lib/services/mobile-auth.service";

export function requestMetaFrom(request: NextRequest): RequestMeta {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;
  return { ip, userAgent };
}
