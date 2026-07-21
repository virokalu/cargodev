import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/services/auth-guard";
import { listVehicles, listDistinctDestinations } from "@/lib/services/vehicle.service";
import { listRowColourStatuses } from "@/lib/services/lookup.service";
import { parseVehicleListParams } from "@/lib/vehicle-list-url";
import { Button } from "@/components/ui/button";
import { VehicleFiltersBar } from "@/components/vehicles/vehicle-filters-bar";
import { VehiclesTable } from "@/components/vehicles/vehicles-table";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = parseVehicleListParams(await searchParams);

  const [{ rows, total }, destinations, rowColourStatuses] = await Promise.all([
    listVehicles(user.orgId, params),
    listDistinctDestinations(user.orgId),
    listRowColourStatuses(user.orgId),
  ]);

  // US-02: Viewer is read-only everywhere — no inline editors, no Edit/Delete
  // controls rendered in the table, not just disabled.
  const canWrite = ["ADMINISTRATOR", "MANAGER", "OPERATOR"].includes(user.role);
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
        <Link href="/vehicles/add">
          <Button>
            <Plus className="mr-2 size-4" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      <VehicleFiltersBar params={params} destinations={destinations} rowColourStatuses={rowColourStatuses} />

      <VehiclesTable
        rows={rows}
        total={total}
        params={params}
        rowColourStatuses={rowColourStatuses}
        canWrite={canWrite}
        canDelete={canDelete}
      />
    </div>
  );
}
