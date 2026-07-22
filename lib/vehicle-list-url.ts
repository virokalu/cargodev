// URL <-> query-params mapping for the vehicle table (US-07: filters persist
// via the URL, which survives navigating away and back within the session).
// Shared between the server page (parses the incoming URL) and the client
// filter bar / table sort links (build hrefs for the next click) so both
// sides agree on the same param names and defaults.

import type {
  TriStateFilterValue,
  VehicleListParams,
  VehicleListSortKey,
} from "@/lib/services/vehicle.service";
import type { ShipmentStatus } from "@/lib/constants/shipment-status";
import type { ShippingMethod } from "@prisma/client";

export const VEHICLE_LIST_DEFAULTS: VehicleListParams = {
  page: 1,
  pageSize: 25,
  track: "ALL",
  search: "",
  shipmentStatus: "ALL",
  destination: "ALL",
  rowColourStatusId: "ALL",
  brandId: "ALL",
  modelId: "ALL",
  gradeId: "ALL",
  auctionHallId: "ALL",
  freightAgentId: "ALL",
  vehicleLocationId: "ALL",
  customerId: "ALL",
  shippingMethod: "ALL",
  auctionBillPaid: "ALL",
  logBook: "ALL",
  extraKey: "ALL",
  sortBy: "serial",
  sortDir: "asc",
};

const SORT_KEYS: VehicleListSortKey[] = [
  "serial",
  "chassisNo",
  "model",
  "yom",
  "shipmentStatus",
  "purchaseDate",
  "etd",
  "eta",
  "destination",
  "docsArrivedDate",
  "nameChangeDeadline",
  "massoDate",
  "docSentDate",
  "recycleDate",
];

const SHIPMENT_STATUSES: ShipmentStatus[] = ["PENDING", "BOOKING_RECEIVED", "SHIPPED"];
const SHIPPING_METHODS: ShippingMethod[] = ["RORO", "CONTAINER"];
const TRI_STATE_VALUES: TriStateFilterValue[] = ["YES", "NO", "BLANK"];

function parseTriState(value: string | undefined): TriStateFilterValue {
  return TRI_STATE_VALUES.includes(value as TriStateFilterValue)
    ? (value as TriStateFilterValue)
    : "ALL";
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses raw Next.js searchParams into safe, clamped query params — the URL
 * is user-editable, so enum values, sort keys and numbers are never trusted
 * as-is (falls back to defaults instead of erroring). */
export function parseVehicleListParams(
  searchParams: Record<string, string | string[] | undefined>
): VehicleListParams {
  const track = firstValue(searchParams.track);
  const status = firstValue(searchParams.status);
  const method = firstValue(searchParams.method);
  const sortBy = firstValue(searchParams.sort);
  const sortDir = firstValue(searchParams.dir);
  const page = Number.parseInt(firstValue(searchParams.page) ?? "", 10);

  return {
    page: Number.isFinite(page) && page > 0 ? page : VEHICLE_LIST_DEFAULTS.page,
    pageSize: VEHICLE_LIST_DEFAULTS.pageSize,
    track: track === "FC" || track === "FL" ? track : "ALL",
    search: firstValue(searchParams.q)?.trim() ?? "",
    shipmentStatus: SHIPMENT_STATUSES.includes(status as ShipmentStatus)
      ? (status as ShipmentStatus)
      : "ALL",
    destination: firstValue(searchParams.destination) || "ALL",
    rowColourStatusId: firstValue(searchParams.rowColour) || "ALL",
    brandId: firstValue(searchParams.brand) || "ALL",
    modelId: firstValue(searchParams.model) || "ALL",
    gradeId: firstValue(searchParams.grade) || "ALL",
    auctionHallId: firstValue(searchParams.hall) || "ALL",
    freightAgentId: firstValue(searchParams.agent) || "ALL",
    vehicleLocationId: firstValue(searchParams.location) || "ALL",
    customerId: firstValue(searchParams.customer) || "ALL",
    shippingMethod: SHIPPING_METHODS.includes(method as ShippingMethod)
      ? (method as ShippingMethod)
      : "ALL",
    auctionBillPaid: parseTriState(firstValue(searchParams.billPaid)),
    logBook: parseTriState(firstValue(searchParams.logBook)),
    extraKey: parseTriState(firstValue(searchParams.extraKey)),
    sortBy: SORT_KEYS.includes(sortBy as VehicleListSortKey)
      ? (sortBy as VehicleListSortKey)
      : VEHICLE_LIST_DEFAULTS.sortBy,
    sortDir: sortDir === "desc" ? "desc" : "asc",
  };
}

/** Builds an /vehicles href from the given params plus overrides (e.g.
 * clicking a sort header or a pagination link), omitting default values so
 * the URL stays short and shareable. */
export function buildVehiclesHref(
  params: VehicleListParams,
  overrides: Partial<VehicleListParams> = {}
): string {
  const merged = { ...params, ...overrides };
  const query = new URLSearchParams();

  if (merged.search) query.set("q", merged.search);
  if (merged.track !== "ALL") query.set("track", merged.track);
  if (merged.shipmentStatus !== "ALL") query.set("status", merged.shipmentStatus);
  if (merged.destination !== "ALL") query.set("destination", merged.destination);
  if (merged.rowColourStatusId !== "ALL") query.set("rowColour", merged.rowColourStatusId);
  if (merged.brandId !== "ALL") query.set("brand", merged.brandId);
  if (merged.modelId !== "ALL") query.set("model", merged.modelId);
  if (merged.gradeId !== "ALL") query.set("grade", merged.gradeId);
  if (merged.auctionHallId !== "ALL") query.set("hall", merged.auctionHallId);
  if (merged.freightAgentId !== "ALL") query.set("agent", merged.freightAgentId);
  if (merged.vehicleLocationId !== "ALL") query.set("location", merged.vehicleLocationId);
  if (merged.customerId !== "ALL") query.set("customer", merged.customerId);
  if (merged.shippingMethod !== "ALL") query.set("method", merged.shippingMethod);
  if (merged.auctionBillPaid !== "ALL") query.set("billPaid", merged.auctionBillPaid);
  if (merged.logBook !== "ALL") query.set("logBook", merged.logBook);
  if (merged.extraKey !== "ALL") query.set("extraKey", merged.extraKey);
  if (merged.sortBy !== VEHICLE_LIST_DEFAULTS.sortBy) query.set("sort", merged.sortBy);
  if (merged.sortDir !== VEHICLE_LIST_DEFAULTS.sortDir) query.set("dir", merged.sortDir);
  if (merged.page !== VEHICLE_LIST_DEFAULTS.page) query.set("page", String(merged.page));

  const qs = query.toString();
  return qs ? `/vehicles?${qs}` : "/vehicles";
}
