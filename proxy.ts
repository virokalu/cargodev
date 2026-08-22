// CORS for the mobile Bearer-token API (/api/v1/*) only. The web app's
// NextAuth routes (/api/auth/*) are cookie-session based and stay untouched
// by this proxy — they keep the browser's default same-origin protection,
// which matters for CSRF in a way it doesn't for a Bearer token.
//
// Route Handlers never see the browser's OPTIONS preflight unless a route
// defines OPTIONS itself, so this also answers the preflight directly.
//
// Next.js 16 renamed "Middleware" to "Proxy" (same file/export shape, new
// name — see AGENTS.md: this isn't the Next.js you know). File must be
// proxy.ts with an exported `proxy` function, not middleware.ts/middleware.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

function allowedOrigins(): string[] {
  const configured = env.CORS_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured;
}

const CORS_OPTIONS = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isAllowedOrigin = allowedOrigins().includes(origin);

  if (request.method === "OPTIONS") {
    return NextResponse.json(
      {},
      {
        headers: {
          ...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
          ...CORS_OPTIONS,
        },
      }
    );
  }

  const response = NextResponse.next();
  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  Object.entries(CORS_OPTIONS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: "/api/v1/:path*",
};
