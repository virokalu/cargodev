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

  // NextAuth — must be a long random string (openssl rand -base64 32)
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: requireEnv("NEXTAUTH_URL"),

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

  // Resend — optional until email notifications are wired up
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
} as const;
