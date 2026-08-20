// NextAuth v4 configuration.
// Strategy: JWT cookie sessions for the web app. Credential verification
// itself lives in lib/services/staff-auth.service.ts so the mobile bearer-
// token login (app/api/v1/auth/login/route.ts) shares the exact same
// email/bcrypt/loginEnabled logic and login throttle instead of a second copy.

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyStaffCredentials } from "@/lib/services/staff-auth.service";
import { ServiceError } from "@/lib/errors";
import type { StaffRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let verified;
        try {
          verified = await verifyStaffCredentials(credentials.email, credentials.password);
        } catch (error) {
          // A ServiceError("FORBIDDEN") here means an active lockout. The web
          // login form only ever shows a generic failure message anyway, so
          // collapse it to the same null-return NextAuth treats as "sign-in
          // failed" — the mobile login route surfaces this distinctly instead.
          if (error instanceof ServiceError) return null;
          throw error;
        }
        if (!verified) return null;

        return {
          id: verified.id,
          name: verified.name,
          // email is nullable in the schema; NextAuth User.email expects string | null | undefined
          email: verified.email,
          role: verified.role,
          orgId: verified.orgId,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    // 8-hour sessions — typical office day. Adjust if needed.
    maxAge: 8 * 60 * 60,
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
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
