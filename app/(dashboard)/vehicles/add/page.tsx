import { requireUser } from "@/lib/services/auth-guard";
import { previewNextSerial } from "@/lib/services/serial.service";
import { listFreightAgents, listRowColourStatuses } from "@/lib/services/lookup.service";
import { COUNTRIES } from "@/lib/constants/countries";
import { AddVehicleForm } from "@/components/vehicles/add-vehicle-form";

export default async function AddVehiclePage() {
  const user = await requireUser(["ADMINISTRATOR", "MANAGER", "OPERATOR"]);

  // Fetched here (not in the client component) so the serial preview and the
  // Freight Agent / Row Colour Status selects render on first paint with no
  // loading flash — they're plain page content, not popovers.
  const [nextFcSerial, nextFlSerial, freightAgents, rowColourStatuses] = await Promise.all([
    previewNextSerial(user.orgId, "FC"),
    previewNextSerial(user.orgId, "FL"),
    listFreightAgents(user.orgId),
    listRowColourStatuses(user.orgId),
  ]);

  return (
    <AddVehicleForm
      nextFcSerial={nextFcSerial}
      nextFlSerial={nextFlSerial}
      freightAgents={freightAgents}
      rowColourStatuses={rowColourStatuses}
      countries={COUNTRIES}
    />
  );
}
