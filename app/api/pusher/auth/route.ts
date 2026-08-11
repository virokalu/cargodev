// Pusher private-channel auth. pusher-js POSTs socket_id + channel_name here
// (form-encoded) whenever a client tries to subscribe to a private-* channel
// — this is the only thing standing between "any logged-in user" and "any
// logged-in user's notifications," so it must check identity itself rather
// than trust the channel name the client asked for. requireUser() redirects
// on failure (fine for pages, wrong for a JSON API), so this route checks the
// session itself, same reasoning as app/api/uploads/presign/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPusherServerClient, userChannelName } from "@/lib/pusher-server";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.formData().catch(() => null);
  const socketId = body?.get("socket_id");
  const channelName = body?.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  // A user may only ever authorize their own channel — never someone else's,
  // regardless of what channel name the client requests.
  if (channelName !== userChannelName(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authResponse = getPusherServerClient().authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
