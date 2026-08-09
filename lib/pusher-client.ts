"use client";

// Pusher client singleton — one socket connection for the whole app, reused
// across every component that subscribes (components/shell/Header.tsx,
// components/notifications/notification-list.tsx), not one per mount.
//
// NEXT_PUBLIC_* vars are inlined at build time, so they're read directly here
// rather than through lib/env.ts (that module is server-only and requires
// DATABASE_URL etc., which must never ship in a client bundle).

import PusherClient from "pusher-js";
import { userChannelName } from "@/lib/pusher-channels";

export { userChannelName };

let client: PusherClient | null | undefined;

/** Returns null (never throws) when Pusher isn't configured yet — callers
 * skip subscribing instead of crashing the page. Same "unconfigured means
 * quietly do nothing" treatment as lib/pusher-server.ts's server side. */
export function getPusherClient(): PusherClient | null {
  if (client !== undefined) return client;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    client = null;
    return client;
  }

  client = new PusherClient(key, {
    cluster,
    authEndpoint: "/api/pusher/auth",
  });
  return client;
}
