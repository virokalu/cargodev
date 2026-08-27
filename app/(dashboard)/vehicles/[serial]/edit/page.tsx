import { notFound } from "next/navigation";
import { requireUser } from "@/lib/services/auth-guard";
import { getVehicleDetail, type VehicleDetailData } from "@/lib/services/vehicle.service";
import { listRowColourStatuses } from "@/lib/services/lookup.service";
import { listVehicleFiles } from "@/lib/services/file.service";
import { COUNTRIES } from "@/lib/constants/countries";
import { toDateInputValue } from "@/lib/utils";
import { VehicleForm, type FormState } from "@/components/vehicles/vehicle-form";

/** Maps the DB shape to the form's shape — id/name lookup refs pass straight
 * through as ComboboxOption ({id, name}), dates become "YYYY-MM-DD" strings
 * (what a native <input type="date"> produces/expects), everything else is
 * a direct field-for-field copy. */
function toFormValues(vehicle: VehicleDetailData): Partial<FormState> {
  return {
    auctionItemNo: vehicle.auctionItemNo ?? "",
    chassisNo: vehicle.chassisNo ?? "",
    brand: vehicle.brand,
    model: vehicle.model,
    grade: vehicle.grade,
    yomText: vehicle.yom?.toString() ?? "",
    auctionHall: vehicle.auctionHall,
    supplier: vehicle.supplier,
    purchaseDate: toDateInputValue(vehicle.purchaseDate),
    auctionLotNo: vehicle.auctionLotNo ?? "",
    customer: vehicle.customer,
    destination: vehicle.destination ?? "",
    hasPartnership: vehicle.hasPartnership,
    partnerName: vehicle.partnerName ?? "",

    etd: toDateInputValue(vehicle.etd),
    eta: toDateInputValue(vehicle.eta),
    blNo: vehicle.blNo ?? "",
    vesselName: vehicle.vesselName ?? "",
    freightAgent: vehicle.freightAgent,
    shippingMethod: vehicle.shippingMethod ?? "",
    packingAgent: vehicle.packingAgent,
    vanningDate: toDateInputValue(vehicle.vanningDate),
    containerNumber: vehicle.containerNumber ?? "",
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
    rowColourStatusId: vehicle.rowColourStatus?.id ?? "",
    docSentDate: toDateInputValue(vehicle.docSentDate),
    docSentComment: vehicle.docSentComment ?? "",
    recycleDate: toDateInputValue(vehicle.recycleDate),
    jibaishake: vehicle.jibaishake ?? "",
    vehicleRemark: vehicle.vehicleRemark ?? "",

    deliveryDate: toDateInputValue(vehicle.deliveryDate),
    paidByCustomer: vehicle.paidByCustomer ?? false,
    sellingPriceText: vehicle.sellingPrice?.toString() ?? "",
    sellingPriceCurrency: vehicle.sellingPriceCurrency ?? "JPY",
  };
}

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  // Operator can reach this page (to add documents/photos and toggle
  // Auction Bill Paid) but can't edit any general field — canEditFields
  // tells VehicleForm to grey out and disable everything else.
  const user = await requireUser(["ADMINISTRATOR", "MANAGER", "OPERATOR"]);
  const canEditFields = user.role !== "OPERATOR";
  const { serial } = await params;

  const [vehicle, rowColourStatuses] = await Promise.all([
    getVehicleDetail(user.orgId, serial),
    listRowColourStatuses(user.orgId),
  ]);

  if (!vehicle) {
    notFound();
  }

  // Fetched after confirming the vehicle exists — listVehicleFiles does its
  // own ownership check and would throw rather than gracefully 404 if run
  // in parallel with a vehicle that turns out not to exist.
  const files = await listVehicleFiles(user.orgId, vehicle.id);

  return (
    <VehicleForm
      // Forces a remount after Convert to Export + router.refresh() — the
      // form's internal useState initializer only runs once per mount, so a
      // prop change alone wouldn't flip isFC on for the newly-converted
      // vehicle.
      key={`${vehicle.id}-${vehicle.convertedToExport}`}
      mode="edit"
      vehicleId={vehicle.id}
      existingSerial={vehicle.serial}
      existingTrack={vehicle.track}
      existingShipmentStatus={vehicle.shipmentStatus}
      existingConvertedToExport={vehicle.convertedToExport}
      initialValues={toFormValues(vehicle)}
      files={files}
      rowColourStatuses={rowColourStatuses}
      countries={COUNTRIES}
      canEditFields={canEditFields}
    />
  );
}
