// Pure channel-naming helper — no SDK import, so both the server client
// (lib/pusher-server.ts) and the browser client (lib/pusher-client.ts) can
// share the exact same channel name without either one pulling in the
// other's SDK (the server SDK must never ship in a client bundle).

/** Every recipient gets their own private channel — a notification is
 * personal, never broadcast to everyone who happens to be subscribed. */
export function userChannelName(userId: string): string {
  return `private-user-${userId}`;
}
