// Prisma client singleton.
//
// Prisma 7 requires a driver adapter for the PrismaClient at runtime — the
// DATABASE_URL is no longer read from schema.prisma. We use @prisma/adapter-pg
// which wraps the standard `pg` driver.
//
// In development, Next.js hot-reloads modules which would spin up a new
// PrismaClient (and a new connection pool) on every reload. We store the
// instance on the Node.js global object so it survives hot reloads.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  // PrismaPg reads DATABASE_URL from the environment and manages the connection pool.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
