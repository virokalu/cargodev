// CORS for the mobile Bearer-token API only (/api/v1/*). The web app's own
// UI calls these routes same-origin and never needs these headers — this
// exists purely so the Expo/mobile web build (a different origin) can call
// this server. Runs on the Edge runtime, so it reads process.env directly
// instead of importing lib/env.ts (which validates node-only secrets at
// import time).
//
// Named `proxy.ts` (not `middleware.ts`) — Next.js 16 renamed Middleware to
// Proxy. The old filename isn't just ignored on this version, it corrupts
// the dev route table: every route under app/api/*, including ones outside
// this file's own matcher, started 404ing until it was renamed.
//
// Read CORS_ALLOWED_ORIGINS from .env — comma-separated list of allowed
// origins, e.g. http://localhost:19006,http://localhost:8081

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";

function buildCorsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  // Only echo back an origin that's on the allow-list — never "*", since
  // that would let any site call the mobile API from a browser.
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
    headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

export function proxy(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request.headers.get("origin"));

  // The browser's preflight check — Next.js has no default OPTIONS handler,
  // so without this it 404s with no CORS headers and the browser blocks
  // the real request before it's ever sent.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const response = NextResponse.next();
  corsHeaders.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: "/api/v1/:path*",
};
