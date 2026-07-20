// Lookup services — the ONLY code path allowed to create Brand, VehicleModelRef,
// Grade, AuctionHall, TransportCompany or VehicleLocation rows (CLAUDE.md
// architecture rule 8). The combobox-create component calls these through a
// Server Action; it never calls prisma.*.create itself.
//
// WHY case-insensitive matching: "Toyota", "TOYOTA" and "toyota " as free text
// would be three different rows that wreck every filter and dashboard
// grouping. Searching case-insensitively before creating means the same name
// typed in any case reuses the existing row.

import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";

export interface LookupOption {
  id: string;
  name: string;
}

const SEARCH_LIMIT = 20;

/** Every rename below fetches the row first and checks this — `update({where:{id}})`
 * alone can't filter by org_id (id is already the unique key), so ownership
 * has to be verified explicitly instead of left to the query shape. */
function assertBelongsToOrg<T extends { org_id: string }>(
  orgId: string,
  row: T | null,
  notFoundMessage: string
): asserts row is T {
  if (!row || row.org_id !== orgId) {
    throw new ServiceError("NOT_FOUND", notFoundMessage);
  }
}

// ── Brand ──────────────────────────────────────────────────────────────────

export async function searchBrands(orgId: string, query: string): Promise<LookupOption[]> {
  return prisma.brand.findMany({
    where: { org_id: orgId, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  });
}

export async function findOrCreateBrand(orgId: string, name: string): Promise<LookupOption> {
  const trimmed = name.trim();
  const existing = await prisma.brand.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return prisma.brand.create({
    data: { org_id: orgId, name: trimmed },
    select: { id: true, name: true },
  });
}

/** Rename only — merge/deactivate are a separate Settings-page task. Renaming
 * is safe to expose directly on the vehicle form's combobox because vehicles
 * store the brand_id, never the text (CLAUDE.md rule 8) — every vehicle that
 * already used this brand shows the new name immediately. */
export async function renameBrand(orgId: string, id: string, newName: string): Promise<LookupOption> {
  const trimmed = newName.trim();
  const current = await prisma.brand.findUnique({ where: { id } });
  assertBelongsToOrg(orgId, current, "Brand not found.");

  const duplicate = await prisma.brand.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServiceError("CONFLICT", `A brand named "${trimmed}" already exists.`);
  }

  return prisma.brand.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}

// ── Model (scoped to a brand) ────────────────────────────────────────────────

export async function searchModels(
  orgId: string,
  brandId: string,
  query: string
): Promise<LookupOption[]> {
  return prisma.vehicleModelRef.findMany({
    where: { org_id: orgId, brand_id: brandId, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  });
}

export async function findOrCreateModel(
  orgId: string,
  brandId: string,
  name: string
): Promise<LookupOption> {
  const trimmed = name.trim();
  const existing = await prisma.vehicleModelRef.findFirst({
    where: { org_id: orgId, brand_id: brandId, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return prisma.vehicleModelRef.create({
    data: { org_id: orgId, brand_id: brandId, name: trimmed },
    select: { id: true, name: true },
  });
}

export async function renameModel(orgId: string, id: string, newName: string): Promise<LookupOption> {
  const trimmed = newName.trim();
  const current = await prisma.vehicleModelRef.findUnique({ where: { id } });
  assertBelongsToOrg(orgId, current, "Model not found.");

  const duplicate = await prisma.vehicleModelRef.findFirst({
    where: {
      org_id: orgId,
      brand_id: current.brand_id,
      name: { equals: trimmed, mode: "insensitive" },
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServiceError("CONFLICT", `A model named "${trimmed}" already exists under this brand.`);
  }

  return prisma.vehicleModelRef.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}

// ── Grade (scoped to a model, optional on the vehicle) ──────────────────────

export async function searchGrades(
  orgId: string,
  modelId: string,
  query: string
): Promise<LookupOption[]> {
  return prisma.grade.findMany({
    where: { org_id: orgId, model_id: modelId, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  });
}

export async function findOrCreateGrade(
  orgId: string,
  modelId: string,
  name: string
): Promise<LookupOption> {
  const trimmed = name.trim();
  const existing = await prisma.grade.findFirst({
    where: { org_id: orgId, model_id: modelId, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return prisma.grade.create({
    data: { org_id: orgId, model_id: modelId, name: trimmed },
    select: { id: true, name: true },
  });
}

export async function renameGrade(orgId: string, id: string, newName: string): Promise<LookupOption> {
  const trimmed = newName.trim();
  const current = await prisma.grade.findUnique({ where: { id } });
  assertBelongsToOrg(orgId, current, "Grade not found.");

  const duplicate = await prisma.grade.findFirst({
    where: {
      org_id: orgId,
      model_id: current.model_id,
      name: { equals: trimmed, mode: "insensitive" },
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServiceError("CONFLICT", `A grade named "${trimmed}" already exists under this model.`);
  }

  return prisma.grade.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}

// ── Auction Hall ──────────────────────────────────────────────────────────

export async function searchAuctionHalls(orgId: string, query: string): Promise<LookupOption[]> {
  return prisma.auctionHall.findMany({
    where: { org_id: orgId, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  });
}

export async function findOrCreateAuctionHall(orgId: string, name: string): Promise<LookupOption> {
  const trimmed = name.trim();
  const existing = await prisma.auctionHall.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return prisma.auctionHall.create({
    data: { org_id: orgId, name: trimmed },
    select: { id: true, name: true },
  });
}

export async function renameAuctionHall(orgId: string, id: string, newName: string): Promise<LookupOption> {
  const trimmed = newName.trim();
  const current = await prisma.auctionHall.findUnique({ where: { id } });
  assertBelongsToOrg(orgId, current, "Auction hall not found.");

  const duplicate = await prisma.auctionHall.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServiceError("CONFLICT", `An auction hall named "${trimmed}" already exists.`);
  }

  return prisma.auctionHall.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}

// ── Transport Company ────────────────────────────────────────────────────

export async function searchTransportCompanies(orgId: string, query: string): Promise<LookupOption[]> {
  return prisma.transportCompany.findMany({
    where: { org_id: orgId, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  });
}

export async function findOrCreateTransportCompany(
  orgId: string,
  name: string
): Promise<LookupOption> {
  const trimmed = name.trim();
  const existing = await prisma.transportCompany.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return prisma.transportCompany.create({
    data: { org_id: orgId, name: trimmed },
    select: { id: true, name: true },
  });
}

export async function renameTransportCompany(
  orgId: string,
  id: string,
  newName: string
): Promise<LookupOption> {
  const trimmed = newName.trim();
  const current = await prisma.transportCompany.findUnique({ where: { id } });
  assertBelongsToOrg(orgId, current, "Transport company not found.");

  const duplicate = await prisma.transportCompany.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServiceError("CONFLICT", `A transport company named "${trimmed}" already exists.`);
  }

  return prisma.transportCompany.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}

// ── Vehicle Location ──────────────────────────────────────────────────────

export async function searchVehicleLocations(orgId: string, query: string): Promise<LookupOption[]> {
  return prisma.vehicleLocation.findMany({
    where: { org_id: orgId, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  });
}

export async function findOrCreateVehicleLocation(
  orgId: string,
  name: string
): Promise<LookupOption> {
  const trimmed = name.trim();
  const existing = await prisma.vehicleLocation.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return prisma.vehicleLocation.create({
    data: { org_id: orgId, name: trimmed },
    select: { id: true, name: true },
  });
}

export async function renameVehicleLocation(
  orgId: string,
  id: string,
  newName: string
): Promise<LookupOption> {
  const trimmed = newName.trim();
  const current = await prisma.vehicleLocation.findUnique({ where: { id } });
  assertBelongsToOrg(orgId, current, "Vehicle location not found.");

  const duplicate = await prisma.vehicleLocation.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServiceError("CONFLICT", `A vehicle location named "${trimmed}" already exists.`);
  }

  return prisma.vehicleLocation.update({
    where: { id },
    data: { name: trimmed },
    select: { id: true, name: true },
  });
}

// ── Read-only lists (Freight Agent, Row Colour Status — plain selects) ─────
// These are NOT inline-create from the vehicle form: Freight Agent needs its
// RORO/Container capability flags set correctly (no sane default if created
// blind here), and Row Colour Status is admin-managed in Settings.

export interface FreightAgentOption extends LookupOption {
  offersRoro: boolean;
  offersContainer: boolean;
}

export async function listFreightAgents(orgId: string): Promise<FreightAgentOption[]> {
  return prisma.freightAgent.findMany({
    where: { org_id: orgId },
    select: { id: true, name: true, offersRoro: true, offersContainer: true },
    orderBy: { name: "asc" },
  });
}

export async function listRowColourStatuses(orgId: string): Promise<
  (LookupOption & { colour: string; transportCellOnly: boolean })[]
> {
  return prisma.rowColourStatus.findMany({
    where: { org_id: orgId },
    select: { id: true, name: true, colour: true, transportCellOnly: true },
    orderBy: { name: "asc" },
  });
}
