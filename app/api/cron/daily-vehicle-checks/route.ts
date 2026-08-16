// Daily reminder + shipment-status cron (Tech Doc §1's "daily Vercel Cron
// once today > ETD", plus the fuller payment/rikso/LC/ETD/document
// reminder lifecycle — see lib/services/reminder.service.ts). Triggered
// once a day by vercel.json's crons config. CRON_SECRET is the only thing
// standing between "anyone who finds this URL" and "run every reminder
// check right now" — Vercel automatically sends it as a Bearer token when
// CRON_SECRET is set in the project's environment variables, same
// mechanism this route checks for. Thin wrapper only (CLAUDE.md rule 2):
// every actual query/decision lives in reminder.service.ts.

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runDailyVehicleChecks } from "@/lib/services/reminder.service";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runDailyVehicleChecks(env.ORG_ID);
  return NextResponse.json({ ok: true, ...summary });
}
