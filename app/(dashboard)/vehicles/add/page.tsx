import { requireUser } from "@/lib/services/auth-guard";
import { previewNextSerial } from "@/lib/services/serial.service";
import { listRowColourStatuses } from "@/lib/services/lookup.service";
import { COUNTRIES } from "@/lib/constants/countries";
import { AddVehicleForm } from "@/components/vehicles/add-vehicle-form";

export default async function AddVehiclePage() {
  const user = await requireUser(["ADMINISTRATOR", "MANAGER", "OPERATOR"]);

  // Fetched here (not in the client component) so the serial preview and the
  // Row Colour Status select render on first paint with no loading flash —
  // it's plain page content, not a popover. Freight Agent is a popover
  // (FreightAgentCombobox) that loads its own options on open, same as
  // Brand/Model/etc., so it doesn't need an eager list here.
  const [nextFcSerial, nextFlSerial, rowColourStatuses] = await Promise.all([
    previewNextSerial(user.orgId, "FC"),
    previewNextSerial(user.orgId, "FL"),
    listRowColourStatuses(user.orgId),
  ]);

  return (
    <AddVehicleForm
      nextFcSerial={nextFcSerial}
      nextFlSerial={nextFlSerial}
      rowColourStatuses={rowColourStatuses}
      countries={COUNTRIES}
    />
  );
}
