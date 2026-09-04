import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/services/auth-guard";
import { listVehicles, listDistinctDestinations } from "@/lib/services/vehicle.service";
import { getCustomerById } from "@/lib/services/customer.service";
import {
  listRowColourStatuses,
  getBrandById,
  getModelById,
  getGradeById,
  getAuctionHallById,
  getSupplierById,
  getFreightAgentById,
  getPackingAgentById,
  getVehicleLocationById,
  getTransportCompanyById,
} from "@/lib/services/lookup.service";
import { parseVehicleListParams } from "@/lib/vehicle-list-url";
import { Button } from "@/components/ui/button";
import { VehicleFiltersBar } from "@/components/vehicles/vehicle-filters-bar";
import { VehiclesTable } from "@/components/vehicles/vehicles-table";
import type { VehicleFilterSelections } from "@/components/vehicles/vehicle-filters-panel";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = parseVehicleListParams(await searchParams);

  const [
    { rows, total },
    destinations,
    rowColourStatuses,
    customer,
    brand,
    model,
    grade,
    auctionHall,
    supplier,
    freightAgent,
    packingAgent,
    vehicleLocation,
    transportCompany,
  ] = await Promise.all([
    listVehicles(user.orgId, params),
    listDistinctDestinations(user.orgId),
    listRowColourStatuses(user.orgId),
    params.customerId !== "ALL" ? getCustomerById(user.orgId, params.customerId) : null,
    params.brandId !== "ALL" ? getBrandById(user.orgId, params.brandId) : null,
    params.modelId !== "ALL" ? getModelById(user.orgId, params.modelId) : null,
    params.gradeId !== "ALL" ? getGradeById(user.orgId, params.gradeId) : null,
    params.auctionHallId !== "ALL" ? getAuctionHallById(user.orgId, params.auctionHallId) : null,
    params.supplierId !== "ALL" ? getSupplierById(user.orgId, params.supplierId) : null,
    params.freightAgentId !== "ALL" ? getFreightAgentById(user.orgId, params.freightAgentId) : null,
    params.packingAgentId !== "ALL" ? getPackingAgentById(user.orgId, params.packingAgentId) : null,
    params.vehicleLocationId !== "ALL" ? getVehicleLocationById(user.orgId, params.vehicleLocationId) : null,
    params.transportById !== "ALL" ? getTransportCompanyById(user.orgId, params.transportById) : null,
  ]);
  const selected: VehicleFilterSelections = {
    customer,
    brand,
    model,
    grade,
    auctionHall,
    supplier,
    freightAgent,
    packingAgent,
    vehicleLocation,
    transportCompany,
  };

  // US-02: Viewer is read-only everywhere — no inline editors, no Edit/Delete
  // controls rendered in the table, not just disabled. Operator can open the
  // edit page (canEditVehicle) but only to add files and toggle Auction Bill
  // Paid — VehicleForm itself greys out every general field for them
  // (see canEditFields in [serial]/edit/page.tsx). Adding a new vehicle and
  // deleting one stay Admin/Manager only.
  const canCreate = ["ADMINISTRATOR", "MANAGER"].includes(user.role);
  const canWrite = ["ADMINISTRATOR", "MANAGER", "OPERATOR"].includes(user.role);
  const canEditVehicle = ["ADMINISTRATOR", "MANAGER", "OPERATOR"].includes(user.role);
  const canDelete = ["ADMINISTRATOR", "MANAGER"].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">
            {total} vehicle{total === 1 ? "" : "s"} found.
          </p>
        </div>
        {canCreate && (
          <Link href="/vehicles/add">
            <Button>
              <Plus className="mr-2 size-4" />
              Add Vehicle
            </Button>
          </Link>
        )}
      </div>

      <VehicleFiltersBar
        params={params}
        destinations={destinations}
        rowColourStatuses={rowColourStatuses}
        selected={selected}
      />

      <VehiclesTable
        rows={rows}
        total={total}
        params={params}
        rowColourStatuses={rowColourStatuses}
        canWrite={canWrite}
        canEditVehicle={canEditVehicle}
        canDelete={canDelete}
      />
    </div>
  );
}
