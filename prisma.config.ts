// Prisma 7 configuration file.
// In Prisma 7, datasource URL and seed command both live here (not in schema.prisma / package.json).
// See: https://pris.ly/d/config-datasource

import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env from the project root before Prisma reads any env vars.
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL, // migrations MUST use the direct/session URL, never the transaction pooler
  },
});
