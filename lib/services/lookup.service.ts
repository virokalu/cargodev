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

/** Resolves a single brand's label for the vehicle filter panel — only called
 * when a Brand filter is actually active, never as part of listing brands. */
export async function getBrandById(orgId: string, id: string): Promise<LookupOption | null> {
  const brand = await prisma.brand.findFirst({ where: { id, org_id: orgId }, select: { id: true, name: true } });
  return brand ?? null;
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

/** Resolves a single model's label for the vehicle filter panel. */
export async function getModelById(orgId: string, id: string): Promise<LookupOption | null> {
  const model = await prisma.vehicleModelRef.findFirst({
    where: { id, org_id: orgId },
    select: { id: true, name: true },
  });
  return model ?? null;
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

/** Resolves a single grade's label for the vehicle filter panel. */
export async function getGradeById(orgId: string, id: string): Promise<LookupOption | null> {
  const grade = await prisma.grade.findFirst({ where: { id, org_id: orgId }, select: { id: true, name: true } });
  return grade ?? null;
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

/** Resolves a single auction hall's label for the vehicle filter panel. */
export async function getAuctionHallById(orgId: string, id: string): Promise<LookupOption | null> {
  const hall = await prisma.auctionHall.findFirst({ where: { id, org_id: orgId }, select: { id: true, name: true } });
  return hall ?? null;
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

/** Resolves a single transport company's label for the vehicle filter panel. */
export async function getTransportCompanyById(orgId: string, id: string): Promise<LookupOption | null> {
  const company = await prisma.transportCompany.findFirst({
    where: { id, org_id: orgId },
    select: { id: true, name: true },
  });
  return company ?? null;
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

/** Resolves a single vehicle location's label for the vehicle filter panel. */
export async function getVehicleLocationById(orgId: string, id: string): Promise<LookupOption | null> {
  const location = await prisma.vehicleLocation.findFirst({
    where: { id, org_id: orgId },
    select: { id: true, name: true },
  });
  return location ?? null;
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

// ── Freight Agent (inline-create, but RORO/Container capability is set
// explicitly at creation time — never defaulted blind, since those flags
// gate which shipping method can later be picked for that agent) ──────────

export interface FreightAgentOption extends LookupOption {
  offersRoro: boolean;
  offersContainer: boolean;
}

const FREIGHT_AGENT_SELECT = { id: true, name: true, offersRoro: true, offersContainer: true } as const;

export async function listFreightAgents(orgId: string): Promise<FreightAgentOption[]> {
  return prisma.freightAgent.findMany({
    where: { org_id: orgId },
    select: FREIGHT_AGENT_SELECT,
    orderBy: { name: "asc" },
  });
}

/** Resolves a single freight agent's label for the vehicle filter panel. */
export async function getFreightAgentById(orgId: string, id: string): Promise<LookupOption | null> {
  const agent = await prisma.freightAgent.findFirst({
    where: { id, org_id: orgId },
    select: { id: true, name: true },
  });
  return agent ?? null;
}

export async function searchFreightAgents(
  orgId: string,
  query: string,
  method?: "RORO" | "CONTAINER"
): Promise<FreightAgentOption[]> {
  return prisma.freightAgent.findMany({
    where: {
      org_id: orgId,
      name: { contains: query, mode: "insensitive" },
      ...(method === "RORO" && { offersRoro: true }),
      ...(method === "CONTAINER" && { offersContainer: true }),
    },
    select: FREIGHT_AGENT_SELECT,
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
  });
}

function assertHasCapability(offersRoro: boolean, offersContainer: boolean) {
  if (!offersRoro && !offersContainer) {
    throw new ServiceError("VALIDATION", "Select RORO, Container, or both for this agent.");
  }
}

export async function createFreightAgent(
  orgId: string,
  name: string,
  offersRoro: boolean,
  offersContainer: boolean
): Promise<FreightAgentOption> {
  const trimmed = name.trim();
  assertHasCapability(offersRoro, offersContainer);

  // Same case-insensitive dedupe as the other lookups — if the name already
  // exists, reuse that row rather than creating a duplicate. The capability
  // flags picked in the create form are only used for a genuinely new agent.
  const existing = await prisma.freightAgent.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" } },
    select: FREIGHT_AGENT_SELECT,
  });
  if (existing) return existing;

  return prisma.freightAgent.create({
    data: { org_id: orgId, name: trimmed, offersRoro, offersContainer },
    select: FREIGHT_AGENT_SELECT,
  });
}

export async function updateFreightAgent(
  orgId: string,
  id: string,
  name: string,
  offersRoro: boolean,
  offersContainer: boolean
): Promise<FreightAgentOption> {
  const trimmed = name.trim();
  assertHasCapability(offersRoro, offersContainer);

  const current = await prisma.freightAgent.findUnique({ where: { id } });
  assertBelongsToOrg(orgId, current, "Freight agent not found.");

  const duplicate = await prisma.freightAgent.findFirst({
    where: { org_id: orgId, name: { equals: trimmed, mode: "insensitive" }, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServiceError("CONFLICT", `A freight agent named "${trimmed}" already exists.`);
  }

  return prisma.freightAgent.update({
    where: { id },
    data: { name: trimmed, offersRoro, offersContainer },
    select: FREIGHT_AGENT_SELECT,
  });
}

// ── Read-only lists (Row Colour Status — plain select, admin-managed in
// Settings, not inline-create from the vehicle form) ───────────────────────

export async function listRowColourStatuses(orgId: string): Promise<
  (LookupOption & { colour: string; transportCellOnly: boolean })[]
> {
  return prisma.rowColourStatus.findMany({
    where: { org_id: orgId },
    select: { id: true, name: true, colour: true, transportCellOnly: true },
    orderBy: { name: "asc" },
  });
}
