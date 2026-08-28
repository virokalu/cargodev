// Centralised, validated environment accessor — server-side only.
//
// WHY: bare process.env access fails silently mid-request when a variable is
// missing. This module validates at import time so the app crashes immediately
// on startup with a clear error, not in a user-facing request hours later.
//
// HOW TO USE:
//   import { env } from "@/lib/env";
//   env.DATABASE_URL   // always a string, guaranteed at startup
//
// Add every server-side secret here. NEVER prefix secrets with NEXT_PUBLIC_.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Copy .env.example to .env and fill in the value.`
    );
  }
  return value;
}

export const env = {
  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  //SupaBase direct URL for migrations (migrations need a real session, not a pooled one)
  DIRECT_URL: requireEnv("DIRECT_URL"),

  // NextAuth — must be a long random string (openssl rand -base64 32)
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: requireEnv("NEXTAUTH_URL"),

  // Mobile API (/api/v1) bearer access tokens — a separate secret from
  // NEXTAUTH_SECRET so the two can be rotated independently. Required (not
  // an optional "" fallback like the integrations below) because it guards
  // every mobile request — an unconfigured deployment should fail to boot,
  // not silently accept forged tokens.
  MOBILE_JWT_SECRET: requireEnv("MOBILE_JWT_SECRET"),

  // Phase 1 single org (safe fallback — matches prisma/seed.ts)
  ORG_ID: process.env.ORG_ID ?? "org_global_motors",

  // Cloudflare R2 — optional until file uploads are wired up
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ?? "",
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ?? "",
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ?? "",
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ?? "",
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ?? "",

  // Pusher — optional until real-time is wired up
  PUSHER_APP_ID: process.env.PUSHER_APP_ID ?? "",
  PUSHER_KEY: process.env.PUSHER_KEY ?? "",
  PUSHER_SECRET: process.env.PUSHER_SECRET ?? "",
  PUSHER_CLUSTER: process.env.PUSHER_CLUSTER ?? "ap1",

  // Expo push notifications — optional. Push sending works without it (at
  // Expo's default rate limits); setting it raises those limits and lets
  // Expo's dashboard attribute sends to this project.
  EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN ?? "",

  // Resend — optional until email notifications are wired up
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",

  // Vercel Cron — the daily reminder job (app/api/cron/daily-vehicle-checks)
  // rejects every request outright while this is unset, same "optional
  // until wired up" fallback as the integrations above, but the empty
  // string is deliberately never a valid Authorization header value so an
  // unconfigured deployment fails closed instead of open.
  CRON_SECRET: process.env.CRON_SECRET ?? "",
} as const;
