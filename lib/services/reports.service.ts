// Reports (CD-D1-14) — three read-only views of the same underlying vehicle
// pool, grouped by customer, auction hall, or destination country, each
// scoped to one track (FC/export or FL/local) at a time — same FC/FL split
// as the main Vehicles table (components/vehicles/vehicle-filters-bar.tsx).
//
// Destination, Auction Hall, Auction Lot No, Chassis No, and Customer are
// all track-independent fields (set the same way for FC and FL — see
// vehicle.service.ts createVehicle/updateVehicle, neither nulls them for
// FL), so all three reports work for either track. Only ETD/ETA and
// shipment status are genuinely FC-only: FL vehicles never carry ETD/ETA
// and their shipmentStatus is permanently PENDING (vehicle.service.ts never
// runs the ETD-driven transition for FL), so those columns just read as
// blank/Pending for FL rows — same "same columns, empty for FL" precedent
// the Vehicles table already uses, not a different FL-specific schema.
//
// Status is the exact same effective shipment status the Vehicles table
// shows (Pending / Booking Received / Shipped / Shipment Cancelled) — no
// separate "report status" vocabulary. There's no purchase-price field
// anywhere in the Vehicle model, so unlike some reference mockups these
// reports don't show a price/purchase-value figure.

import type { Prisma, SerialPrefix } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeEffectiveShipmentStatus, isCancelShipmentRowColour } from "@/lib/shipment-status";
import type { ShipmentStatus as EffectiveShipmentStatus } from "@/lib/constants/shipment-status";

export type ReportVehicleStatus = EffectiveShipmentStatus;
export type ReportTrack = SerialPrefix;

export interface ReportVehicleRow {
  id: string;
  serial: string;
  vehicleLabel: string;
  chassisNo: string | null;
  auctionLotNo: string | null;
  auctionHallName: string | null;
  destination: string | null;
  customerName: string | null;
  etd: Date | null;
  eta: Date | null;
  status: ReportVehicleStatus;
}

interface ReportGroupStats {
  vehicles: ReportVehicleRow[];
  statusCounts: Record<ReportVehicleStatus, number>;
}

export interface CustomerReportGroup extends ReportGroupStats {
  customerId: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  country: string | null;
}

export interface AuctionHallReportGroup extends ReportGroupStats {
  auctionHallId: string;
  auctionHallName: string;
}

export interface DestinationReportGroup extends ReportGroupStats {
  destination: string;
}

export interface CustomerOption {
  id: string;
  name: string;
}

export interface AuctionHallOption {
  id: string;
  name: string;
}

export interface CustomerVehicleReportData {
  customers: CustomerReportGroup[];
  customerOptions: CustomerOption[];
  destinationOptions: string[];
  auctionHallOptions: string[];
}

export interface AuctionHallVehicleReportData {
  auctionHalls: AuctionHallReportGroup[];
  auctionHallOptions: AuctionHallOption[];
}

export interface DestinationVehicleReportData {
  destinations: DestinationReportGroup[];
  destinationOptions: string[];
}

function emptyStatusCounts(): Record<ReportVehicleStatus, number> {
  return { PENDING: 0, BOOKING_RECEIVED: 0, SHIPPED: 0, CANCELLED: 0 };
}

function distinctSorted(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b));
}

// Shared by all three reports — same vehicle fields regardless of how
// they're grouped, so one select/mapping instead of three near-duplicates.
const REPORT_VEHICLE_SELECT = {
  id: true,
  serial: true,
  chassisNo: true,
  auctionLotNo: true,
  destination: true,
  etd: true,
  eta: true,
  yom: true,
  shipmentStatus: true,
  model: { select: { name: true, brand: { select: { name: true } } } },
  auctionHall: { select: { id: true, name: true } },
  rowColourStatus: { select: { name: true } },
  customer: { select: { id: true, name: true, email: true, phone: true, country: true } },
} satisfies Prisma.VehicleSelect;

type RawReportVehicle = Prisma.VehicleGetPayload<{ select: typeof REPORT_VEHICLE_SELECT }>;

// The "Unit Canceled" row colour only means "shipment cancelled" for FC —
// an FL vehicle has no shipment to cancel, so the same row colour on an FL
// row must not be read as a cancelled status (mirrors the FC-only gate
// vehicle.service.ts's toVehicleListRow already applies for the same
// reason). track is passed in rather than selected on the row because
// every query here is already scoped to a single track.
function toReportVehicleRow(v: RawReportVehicle, track: ReportTrack): ReportVehicleRow {
  const cancelled = track === "FC" && isCancelShipmentRowColour(v.rowColourStatus?.name);
  const status = computeEffectiveShipmentStatus(v.shipmentStatus, v.etd, cancelled);
  return {
    id: v.id,
    serial: v.serial,
    vehicleLabel: [v.yom, v.model?.brand.name, v.model?.name].filter(Boolean).join(" ") || "—",
    chassisNo: v.chassisNo,
    auctionLotNo: v.auctionLotNo,
    auctionHallName: v.auctionHall?.name ?? null,
    destination: v.destination,
    customerName: v.customer?.name ?? null,
    etd: v.etd,
    eta: v.eta,
    status,
  };
}

export async function getCustomerVehicleReport(
  orgId: string,
  track: ReportTrack
): Promise<CustomerVehicleReportData> {
  const vehicles = await prisma.vehicle.findMany({
    where: { org_id: orgId, deletedAt: null, serialPrefix: track, customerId: { not: null } },
    select: REPORT_VEHICLE_SELECT,
    orderBy: [{ serialNumber: "asc" }],
  });

  const groups = new Map<string, CustomerReportGroup>();

  for (const v of vehicles) {
    if (!v.customer) continue;
    const row = toReportVehicleRow(v, track);

    let group = groups.get(v.customer.id);
    if (!group) {
      group = {
        customerId: v.customer.id,
        customerName: v.customer.name,
        email: v.customer.email,
        phone: v.customer.phone,
        country: v.customer.country,
        vehicles: [],
        statusCounts: emptyStatusCounts(),
      };
      groups.set(v.customer.id, group);
    }

    group.vehicles.push(row);
    group.statusCounts[row.status]++;
  }

  const customers = Array.from(groups.values()).sort((a, b) =>
    a.customerName.localeCompare(b.customerName)
  );
  const customerOptions: CustomerOption[] = customers.map((c) => ({
    id: c.customerId,
    name: c.customerName,
  }));

  // Derived from this same result set (not a separate org-wide lookup query)
  // so the dropdowns only ever offer values that actually appear in the
  // report — same reasoning as customerOptions above.
  const destinationOptions = distinctSorted(vehicles.map((v) => v.destination));
  const auctionHallOptions = distinctSorted(vehicles.map((v) => v.auctionHall?.name));

  return { customers, customerOptions, destinationOptions, auctionHallOptions };
}

export async function getAuctionHallVehicleReport(
  orgId: string,
  track: ReportTrack
): Promise<AuctionHallVehicleReportData> {
  const vehicles = await prisma.vehicle.findMany({
    where: { org_id: orgId, deletedAt: null, serialPrefix: track, auctionHallId: { not: null } },
    select: REPORT_VEHICLE_SELECT,
    orderBy: [{ serialNumber: "asc" }],
  });

  const groups = new Map<string, AuctionHallReportGroup>();

  for (const v of vehicles) {
    if (!v.auctionHall) continue;
    const row = toReportVehicleRow(v, track);

    let group = groups.get(v.auctionHall.id);
    if (!group) {
      group = {
        auctionHallId: v.auctionHall.id,
        auctionHallName: v.auctionHall.name,
        vehicles: [],
        statusCounts: emptyStatusCounts(),
      };
      groups.set(v.auctionHall.id, group);
    }

    group.vehicles.push(row);
    group.statusCounts[row.status]++;
  }

  const auctionHalls = Array.from(groups.values()).sort((a, b) =>
    a.auctionHallName.localeCompare(b.auctionHallName)
  );
  const auctionHallOptions: AuctionHallOption[] = auctionHalls.map((h) => ({
    id: h.auctionHallId,
    name: h.auctionHallName,
  }));

  return { auctionHalls, auctionHallOptions };
}

export async function getDestinationVehicleReport(
  orgId: string,
  track: ReportTrack
): Promise<DestinationVehicleReportData> {
  const vehicles = await prisma.vehicle.findMany({
    where: { org_id: orgId, deletedAt: null, serialPrefix: track, destination: { not: null } },
    select: REPORT_VEHICLE_SELECT,
    orderBy: [{ serialNumber: "asc" }],
  });

  const groups = new Map<string, DestinationReportGroup>();

  for (const v of vehicles) {
    if (!v.destination) continue;
    const row = toReportVehicleRow(v, track);

    let group = groups.get(v.destination);
    if (!group) {
      group = {
        destination: v.destination,
        vehicles: [],
        statusCounts: emptyStatusCounts(),
      };
      groups.set(v.destination, group);
    }

    group.vehicles.push(row);
    group.statusCounts[row.status]++;
  }

  const destinations = Array.from(groups.values()).sort((a, b) => a.destination.localeCompare(b.destination));
  const destinationOptions = destinations.map((d) => d.destination);

  return { destinations, destinationOptions };
}
