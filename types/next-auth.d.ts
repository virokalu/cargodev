// Augment NextAuth's built-in types to carry our domain fields
// (role, orgId) through JWT → session → Server Components.

import type { StaffRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: StaffRole;
      orgId: string;
      rememberMe?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: StaffRole;
    orgId: string;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: StaffRole;
    orgId: string;
    rememberMe?: boolean;
  }
}
