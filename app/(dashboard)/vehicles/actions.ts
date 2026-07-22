"use server";

// Thin Server Actions for the vehicle entry slice. Every action does the same
// three things and nothing more: check the session/role, call a service,
// shape the result — no business logic lives here (docs/implementation.md §2,
// "the thin-wrapper rule").

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/auth-guard";
import { ServiceError, type ServiceErrorCode } from "@/lib/errors";
import * as vehicleService from "@/lib/services/vehicle.service";
import * as lookupService from "@/lib/services/lookup.service";
import * as customerService from "@/lib/services/customer.service";

const STAFF_CAN_WRITE = ["ADMINISTRATOR", "MANAGER", "OPERATOR"] as const;
const STAFF_CAN_DELETE = ["ADMINISTRATOR", "MANAGER"] as const;

export type VehicleMutationResult =
  | { ok: true; id: string; serial: string }
  | { ok: false; code: ServiceErrorCode; message: string; fieldErrors?: Record<string, string> };

export async function createVehicleAction(input: unknown): Promise<VehicleMutationResult> {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  try {
    const vehicle = await vehicleService.createVehicle(user, input);
    revalidatePath("/vehicles");
    return { ok: true, id: vehicle.id, serial: vehicle.serial };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

export async function updateVehicleAction(id: string, input: unknown): Promise<VehicleMutationResult> {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  try {
    const vehicle = await vehicleService.updateVehicle(user, id, input);
    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${id}/edit`);
    return { ok: true, id: vehicle.id, serial: vehicle.serial };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }
}

export async function deleteVehicleAction(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser([...STAFF_CAN_DELETE]);
  try {
    await vehicleService.deleteVehicle(user.orgId, user.id, id);
    revalidatePath("/vehicles");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export async function updateRowColourStatusAction(
  id: string,
  rowColourStatusId: string | null
): Promise<void> {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  await vehicleService.updateVehicleRowColourStatus(user.orgId, user.id, id, rowColourStatusId);
  revalidatePath("/vehicles");
}

export async function checkChassisDuplicateAction(
  chassisNo: string,
  excludeId?: string
): Promise<boolean> {
  const user = await requireUser();
  return vehicleService.hasDuplicateChassisNo(user.orgId, chassisNo, excludeId);
}

export async function previewNextSerialAction(prefix: "FC" | "FL"): Promise<string> {
  const user = await requireUser();
  const { previewNextSerial } = await import("@/lib/services/serial.service");
  return previewNextSerial(user.orgId, prefix);
}

// ── Brand / Model / Grade ────────────────────────────────────────────────

export async function searchBrandsAction(query: string) {
  const user = await requireUser();
  return lookupService.searchBrands(user.orgId, query);
}

export async function createBrandAction(name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  return lookupService.findOrCreateBrand(user.orgId, name);
}

export async function renameBrandAction(id: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  const renamed = await lookupService.renameBrand(user.orgId, id, name);
  revalidatePath("/vehicles");
  return renamed;
}

export async function searchModelsAction(brandId: string, query: string) {
  const user = await requireUser();
  return lookupService.searchModels(user.orgId, brandId, query);
}

export async function createModelAction(brandId: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  return lookupService.findOrCreateModel(user.orgId, brandId, name);
}

export async function renameModelAction(id: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  const renamed = await lookupService.renameModel(user.orgId, id, name);
  revalidatePath("/vehicles");
  return renamed;
}

export async function searchGradesAction(modelId: string, query: string) {
  const user = await requireUser();
  return lookupService.searchGrades(user.orgId, modelId, query);
}

export async function createGradeAction(modelId: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  return lookupService.findOrCreateGrade(user.orgId, modelId, name);
}

export async function renameGradeAction(id: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  const renamed = await lookupService.renameGrade(user.orgId, id, name);
  revalidatePath("/vehicles");
  return renamed;
}

// ── Auction Hall / Transport Company / Vehicle Location ───────────────────

export async function searchAuctionHallsAction(query: string) {
  const user = await requireUser();
  return lookupService.searchAuctionHalls(user.orgId, query);
}

export async function createAuctionHallAction(name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  return lookupService.findOrCreateAuctionHall(user.orgId, name);
}

export async function renameAuctionHallAction(id: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  const renamed = await lookupService.renameAuctionHall(user.orgId, id, name);
  revalidatePath("/vehicles");
  return renamed;
}

export async function searchTransportCompaniesAction(query: string) {
  const user = await requireUser();
  return lookupService.searchTransportCompanies(user.orgId, query);
}

export async function createTransportCompanyAction(name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  return lookupService.findOrCreateTransportCompany(user.orgId, name);
}

export async function renameTransportCompanyAction(id: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  const renamed = await lookupService.renameTransportCompany(user.orgId, id, name);
  revalidatePath("/vehicles");
  return renamed;
}

export async function searchVehicleLocationsAction(query: string) {
  const user = await requireUser();
  return lookupService.searchVehicleLocations(user.orgId, query);
}

export async function createVehicleLocationAction(name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  return lookupService.findOrCreateVehicleLocation(user.orgId, name);
}

export async function renameVehicleLocationAction(id: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  const renamed = await lookupService.renameVehicleLocation(user.orgId, id, name);
  revalidatePath("/vehicles");
  return renamed;
}

// ── Freight Agent ─────────────────────────────────────────────────────────

export async function searchFreightAgentsAction(query: string, method?: "RORO" | "CONTAINER") {
  const user = await requireUser();
  return lookupService.searchFreightAgents(user.orgId, query, method);
}

export async function createFreightAgentAction(
  name: string,
  offersRoro: boolean,
  offersContainer: boolean
) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  return lookupService.createFreightAgent(user.orgId, name, offersRoro, offersContainer);
}

export async function updateFreightAgentAction(
  id: string,
  name: string,
  offersRoro: boolean,
  offersContainer: boolean
) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  const updated = await lookupService.updateFreightAgent(user.orgId, id, name, offersRoro, offersContainer);
  revalidatePath("/vehicles");
  return updated;
}

// ── Customer ──────────────────────────────────────────────────────────────

export async function searchCustomersAction(query: string) {
  const user = await requireUser();
  return customerService.searchCustomers(user.orgId, query);
}

export async function createCustomerAction(name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  return customerService.createCustomer(user.orgId, name);
}

export async function renameCustomerAction(id: string, name: string) {
  const user = await requireUser([...STAFF_CAN_WRITE]);
  const renamed = await customerService.renameCustomer(user.orgId, id, name);
  revalidatePath("/vehicles");
  return renamed;
}
