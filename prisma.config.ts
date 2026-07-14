// Prisma 7 configuration file.
// The datasource URL (formerly in schema.prisma) now lives here.
// See: https://pris.ly/d/config-datasource

import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    // process.env is used directly so that Prisma CLI commands (validate, migrate, etc.)
    // can still work even if DATABASE_URL comes from a tool like dotenv-cli or the shell.
    url: process.env.DATABASE_URL ?? "",
  },
});
