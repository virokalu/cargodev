// Vercel sets VERCEL_ENV to "production" | "preview" | "development".
// Preview builds run on every branch/PR push against the SAME Supabase database
// as production (Phase 1 has no separate staging DB). Applying migrations there
// would mutate prod data before a PR is even reviewed, so migrations only run
// on production builds (VERCEL_ENV unset means a local/non-Vercel build).
import { execSync } from "node:child_process";

const vercelEnv = process.env.VERCEL_ENV;
const isProductionBuild = !vercelEnv || vercelEnv === "production";

if (isProductionBuild) {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`Skipping prisma migrate deploy (VERCEL_ENV=${vercelEnv})`);
}

execSync("npx next build", { stdio: "inherit" });
