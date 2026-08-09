import { notFound } from "next/navigation";
import { requireUser } from "@/lib/services/auth-guard";
import { getVehicleDetail } from "@/lib/services/vehicle.service";
import { listVehicleFiles } from "@/lib/services/file.service";
import { VehicleDetailView } from "@/components/vehicles/vehicle-detail-view";

// Read-only detail page (US-10) — every role can view, including Viewer
// (CLAUDE.md: "Viewer gets read-only everywhere"), so unlike the edit page
// this has no requireUser role whitelist.
export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const user = await requireUser();
  const { serial } = await params;

  const vehicle = await getVehicleDetail(user.orgId, serial);
  if (!vehicle) {
    notFound();
  }

  // Fetched after confirming the vehicle exists, same reasoning as the edit
  // page: listVehicleFiles does its own ownership check and would throw
  // rather than gracefully 404 if run in parallel with a vehicle that
  // turns out not to exist.
  const files = await listVehicleFiles(user.orgId, vehicle.id);

  return <VehicleDetailView vehicle={vehicle} files={files} />;
}
