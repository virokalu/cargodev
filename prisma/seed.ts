// Prisma seed — run with: npx prisma db seed
// Creates the single Global Motors org, serial counters, and a default admin account.
// Adjust lastNumber values once you extract the last FC/FL serials from the old sheets (§3, Q3).

import path from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Organization ──────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: "org_global_motors" },
    update: {},
    create: {
      id: "org_global_motors",
      name: "Global Motors (Pvt) Ltd",
    },
  });

  console.log(`Org: ${org.name}`);

  // ── Serial counters (one per prefix) ──────────────────────────────────────
  // TODO: before real entry starts, set lastNumber to the highest serial already
  // used in the old spreadsheets (e.g. if the last FC entry was FC1023, set lastNumber = 1023).
  await prisma.serialCounter.upsert({
    where: { org_id_prefix: { org_id: org.id, prefix: "FC" } },
    update: {},
    create: { org_id: org.id, prefix: "FC", lastNumber: 0 },
  });

  await prisma.serialCounter.upsert({
    where: { org_id_prefix: { org_id: org.id, prefix: "FL" } },
    update: {},
    create: { org_id: org.id, prefix: "FL", lastNumber: 0 },
  });

  console.log("Serial counters: FC=0, FL=0 (update before real entry starts)");

  // ── Default admin account ─────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@globalmotors.lk";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD is not set in .env — cannot seed admin account.");

  const hashed = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { org_id_email: { org_id: org.id, email: adminEmail } },
    update: {},
    create: {
      org_id: org.id,
      userType: "STAFF",
      name: "Administrator",
      email: adminEmail,
      password: hashed,
      loginEnabled: true,
      role: "ADMINISTRATOR",
    },
  });

  console.log(`Admin user: ${admin.email} (change password on first login)`);

  // ── Default row colour statuses ───────────────────────────────────────────
  // These match the spec §1. Admins can adjust colours in Settings later.
  const rowStatuses = [
    { name: "Name Change Needed",      colour: "#f59e0b", transportCellOnly: false },
    { name: "Faxed to Auction",        colour: "#3b82f6", transportCellOnly: false },
    { name: "Sold",                    colour: "#22c55e", transportCellOnly: false },
    { name: "Resold in Auction",       colour: "#a855f7", transportCellOnly: false },
    { name: "Shaken Fax from Auc OK",  colour: "#06b6d4", transportCellOnly: false },
    { name: "Unit Canceled",           colour: "#ef4444", transportCellOnly: false },
    // Special: colours only the Transport By cell, not the whole row. A
    // distinct shade from "Sold" (both green, but Sold colours the whole
    // row) so the two are never visually confused with each other.
    { name: "Transport Complete",      colour: "#15803d", transportCellOnly: true  },
  ];

  for (const status of rowStatuses) {
    await prisma.rowColourStatus.upsert({
      where: { org_id_name: { org_id: org.id, name: status.name } },
      update: {},
      create: { org_id: org.id, ...status },
    });
  }

  console.log(`Row colour statuses: ${rowStatuses.length} created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
