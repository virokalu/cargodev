// NextAuth v4 configuration.
// Strategy: JWT cookie sessions now; a separate JWT-bearer branch will serve
// the Phase 2 mobile app from the same service (no data migration needed).

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { decode as jwtDecode, encode as jwtEncode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import type { StaffRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rememberMe =
          credentials.rememberMe === "true" ||
          credentials.rememberMe === "on";

        // Look up staff user only — customers cannot log in in Phase 1.
        const user = await prisma.user.findFirst({
          where: {
            org_id: env.ORG_ID,
            email: credentials.email,
            userType: "STAFF",
            loginEnabled: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            org_id: true,
          },
        });

        // `role` is nullable in the schema (customers have no role) but we already
        // filter userType=STAFF above, so null here means data integrity issue — reject.
        if (!user || !user.password || !user.role) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordValid) return null;

        // Record the login timestamp (non-blocking — don't await).
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
          })
          .catch(() => {
            // Intentionally ignore — a failed timestamp update must not block login.
          });

        return {
          id: user.id,
          name: user.name,
          // email is nullable in the schema; NextAuth User.email expects string | null | undefined
          email: user.email,
          // role is confirmed non-null above
          role: user.role,
          orgId: user.org_id,
          rememberMe,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    // 8-hour sessions — typical office day. Adjust if needed.
    maxAge: 8 * 60 * 60,
  },

  jwt: {
    encode: async ({ token, secret }) => {
      const maxAge = token?.rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
      return await jwtEncode({ token, maxAge, secret });
    },
    decode: async ({ token, secret }) => {
      return await jwtDecode({ token, secret });
    },
  },

  callbacks: {
    // Encode extra fields into the JWT token when the user first signs in.
    // `trigger`/`session` are populated when a client calls useSession().update(...)
    // (e.g. after Settings → Profile saves a new name) — without this branch the
    // JWT would keep showing whatever name was true at login until the next
    // sign-in, since a JWT session never re-reads the database on its own.
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // Cast: our authorize() return includes these but NextAuth's User type doesn't.
        token.role = (user as { role: StaffRole }).role;
        token.orgId = (user as { orgId: string }).orgId;
        token.rememberMe = (user as { rememberMe: boolean }).rememberMe;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },

    // Expose the extra fields on the session object that Server Components receive.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as StaffRole;
        session.user.orgId = token.orgId as string;
        session.user.rememberMe = token.rememberMe as boolean | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
