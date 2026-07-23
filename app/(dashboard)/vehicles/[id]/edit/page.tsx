import { notFound } from "next/navigation";
import { requireUser } from "@/lib/services/auth-guard";
import { getVehicleForEdit, type VehicleEditData } from "@/lib/services/vehicle.service";
import { listRowColourStatuses } from "@/lib/services/lookup.service";
import { COUNTRIES } from "@/lib/constants/countries";
import { toDateInputValue } from "@/lib/utils";
import { VehicleForm, type FormState } from "@/components/vehicles/vehicle-form";

/** Maps the DB shape to the form's shape — id/name lookup refs pass straight
 * through as ComboboxOption ({id, name}), dates become "YYYY-MM-DD" strings
 * (what a native <input type="date"> produces/expects), everything else is
 * a direct field-for-field copy. */
function toFormValues(vehicle: VehicleEditData): Partial<FormState> {
  return {
    auctionItemNo: vehicle.auctionItemNo ?? "",
    chassisNo: vehicle.chassisNo ?? "",
    brand: vehicle.brand,
    model: vehicle.model,
    grade: vehicle.grade,
    yomText: vehicle.yom?.toString() ?? "",
    auctionHall: vehicle.auctionHall,
    purchaseDate: toDateInputValue(vehicle.purchaseDate),
    auctionLotNo: vehicle.auctionLotNo ?? "",
    customer: vehicle.customer,
    destination: vehicle.destination ?? "",

    etd: toDateInputValue(vehicle.etd),
    eta: toDateInputValue(vehicle.eta),
    blNo: vehicle.blNo ?? "",
    freightAgent: vehicle.freightAgent,
    shippingMethod: vehicle.shippingMethod ?? "",
    trackingNo: vehicle.trackingNo ?? "",

    transportBy: vehicle.transportBy,
    vehicleLocation: vehicle.vehicleLocation,
    massoDate: toDateInputValue(vehicle.massoDate),
    billNumber: vehicle.billNumber ?? "",
    lcNo: vehicle.lcNo ?? "",
    docsArrivedDate: toDateInputValue(vehicle.docsArrivedDate),

    auctionBillPaid: vehicle.auctionBillPaid,
    logBook: vehicle.logBook,
    extraKey: vehicle.extraKey,
    nameChangeDeadline: toDateInputValue(vehicle.nameChangeDeadline),
    rowColourStatusId: vehicle.rowColourStatusId ?? "",
    docSentDate: toDateInputValue(vehicle.docSentDate),
    docSentComment: vehicle.docSentComment ?? "",
    recycleDate: toDateInputValue(vehicle.recycleDate),
    jibaishake: vehicle.jibaishake ?? "",
  };
}

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(["ADMINISTRATOR", "MANAGER", "OPERATOR"]);
  const { id } = await params;

  const [vehicle, rowColourStatuses] = await Promise.all([
    getVehicleForEdit(user.orgId, id),
    listRowColourStatuses(user.orgId),
  ]);

  if (!vehicle) {
    notFound();
  }

  return (
    <VehicleForm
      mode="edit"
      vehicleId={vehicle.id}
      existingSerial={vehicle.serial}
      existingTrack={vehicle.track}
      existingShipmentStatus={vehicle.shipmentStatus}
      initialValues={toFormValues(vehicle)}
      rowColourStatuses={rowColourStatuses}
      countries={COUNTRIES}
    />
  );
}
