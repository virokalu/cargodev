// Pusher server client — real-time fan-out for in-app notifications. Every
// live-update trigger in the app goes through this module; nothing else
// should construct a Pusher instance. Mirrors lib/r2.ts's lazy-config shape.

import PusherServer from "pusher";
import { env } from "@/lib/env";
import { userChannelName } from "@/lib/pusher-channels";

export { userChannelName };

// PUSHER_APP_ID/KEY/SECRET stay optional in lib/env.ts (imported almost
// everywhere at startup) — this check runs lazily, only when something
// actually tries to send a real-time event, so an unconfigured environment
// can still boot for every page that isn't waiting on a live update.
function requirePusherConfig(): void {
  const missing = (["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET"] as const).filter(
    (key) => !env[key]
  );
  if (missing.length > 0) {
    throw new Error(`Missing Pusher configuration: ${missing.join(", ")}. Check your .env file.`);
  }
}

let client: PusherServer | null = null;

function getClient(): PusherServer {
  if (client) return client;
  requirePusherConfig();
  client = new PusherServer({
    appId: env.PUSHER_APP_ID,
    key: env.PUSHER_KEY,
    secret: env.PUSHER_SECRET,
    cluster: env.PUSHER_CLUSTER,
    useTLS: true,
  });
  return client;
}

/** Fire-and-forget: callers must never let a Pusher failure block the
 * mutation that triggered it (same treatment as lib/r2.ts's best-effort
 * delete-on-replace) — this throws on failure, so call it from inside a
 * .catch()-guarded call, not awaited directly in the request path. */
export async function triggerUserEvent(
  userId: string,
  event: string,
  payload: unknown
): Promise<void> {
  await getClient().trigger(userChannelName(userId), event, payload);
}

export { getClient as getPusherServerClient };
