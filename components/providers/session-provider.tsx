"use client";

// Thin wrapper so the dashboard's Server Component layout can still call
// requireUser() for its own render, while client components underneath
// (e.g. the Settings → Profile form) get access to useSession()'s update()
// function to push a changed name into the session without forcing a
// sign-out/sign-in round trip.

import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}