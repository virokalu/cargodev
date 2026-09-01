// Expo push notification client — the push channel in
// notification.service.ts's fan-out, alongside its existing Pusher branch.
// Mirrors lib/pusher-server.ts's lazy-client shape: nothing else should
// construct an Expo SDK client directly.
//
// IMPORTANT for the mobile app: as of Expo SDK 53, remote push notifications
// do NOT work inside Expo Go — testing requires a development build
// (expo-dev-client). Push also doesn't work reliably in the iOS Simulator;
// a physical iPhone is needed to test that side.

import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { env } from "@/lib/env";
import { removeDeviceTokens } from "@/lib/services/device-token.service";

let client: Expo | null = null;

function getClient(): Expo {
  if (client) return client;
  // No required config, unlike Pusher/R2 — Expo's push service works
  // keyless at default rate limits. accessToken just raises those limits.
  client = new Expo(env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : {});
  return client;
}

export interface PushNotificationInput {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Fire-and-forget, best-effort — same treatment as pusher-server.ts's
 * triggerUserEvent: never let a push failure block the mutation that
 * triggered it. Call from a .catch()-guarded call, not awaited directly in
 * the request path.
 *
 * Sends in Expo's required chunks and prunes any token a ticket comes back
 * DeviceNotRegistered for (uninstalled app, rotated token — no point
 * sending to it again). Tickets are paired with tokens per-chunk, not by a
 * flattened index across all chunks — a failed chunk earlier in the batch
 * must never shift which token a later chunk's tickets get attributed to.
 */
export async function sendExpoPushNotifications(
  expoPushTokens: string[],
  notification: PushNotificationInput
): Promise<void> {
  // Tokens are already validated at registration time (device-
  // token.service.ts's Expo.isExpoPushToken check), but a defensive filter
  // here costs nothing and guards against a token going stale in some
  // future Expo SDK format change.
  const validTokens = expoPushTokens.filter((token) => Expo.isExpoPushToken(token));
  if (validTokens.length === 0) return;

  const expo = getClient();
  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    sound: "default",
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const deadTokens: string[] = [];
  let cursor = 0;

  for (const chunk of chunks) {
    const chunkTokens = validTokens.slice(cursor, cursor + chunk.length);
    cursor += chunk.length;

    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          deadTokens.push(chunkTokens[i]);
        }
      });
    } catch (error) {
      // One chunk failing (network blip, Expo outage) must not throw into
      // the caller's fire-and-forget call — log and move on to the rest.
      console.error("Expo push send failed for a chunk", error);
    }
  }

  if (deadTokens.length > 0) {
    await removeDeviceTokens(deadTokens).catch((e) =>
      console.error("Failed to prune dead Expo push tokens", e)
    );
  }
}
