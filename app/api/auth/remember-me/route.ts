import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

const EIGHT_HOURS = 8 * 60 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rememberMe = body?.rememberMe === true;

  const maxAge = rememberMe ? THIRTY_DAYS : EIGHT_HOURS;
  const response = NextResponse.json({ success: true });
  const requestCookies = await cookies();

  for (const name of SESSION_COOKIE_NAMES) {
    const existing = requestCookies.get(name);
    if (!existing?.value) continue;

    response.cookies.set({
      name,
      value: existing.value,
      maxAge,
      path: "/",
      secure: true,
      sameSite: "lax",
      httpOnly: true,
    });
  }

  return response;
}
