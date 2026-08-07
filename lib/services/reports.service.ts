// Reports (CD-D1-14) — three read-only views of the same underlying FC
// vehicle pool, grouped by customer, auction hall, or destination country.
// FL vehicles are excluded from all three: shipment status, destination,
// ETD/ETA aren't tracked for FL at all (CLAUDE.md), so they have nothing to
// report here.
//
// Status is the exact same effective shipment status the Vehicles table
// shows (Pending / Booking Received / Shipped / Shipment Cancelled) — no
// separate "report status" vocabulary. "Delayed" is a flag layered on top
// (Shipped with its ETA already passed), not a 5th status: there's nowhere
// in the schema that marks a shipment "arrived". There's likewise no
// purchase-price field anywhere in the Vehicle model, so unlike some
// reference mockups these reports don't show a price/purchase-value figure.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeEffectiveShipmentStatus,
  isCancelShipmentRowColour,
  todayAtMidnight,
} from "@/lib/shipment-status";
import type { ShipmentStatus as EffectiveShipmentStatus } from "@/lib/constants/shipment-status";

export type ReportVehicleStatus = EffectiveShipmentStatus;

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
  isDelayed: boolean;
}

interface ReportGroupStats {
  vehicles: ReportVehicleRow[];
  statusCounts: Record<ReportVehicleStatus, number>;
  delayedCount: number;
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

function isVehicleDelayed(status: EffectiveShipmentStatus, eta: Date | null): boolean {
  return status === "SHIPPED" && eta !== null && eta.getTime() < todayAtMidnight().getTime();
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

function toReportVehicleRow(v: RawReportVehicle): ReportVehicleRow {
  const status = computeEffectiveShipmentStatus(
    v.shipmentStatus,
    v.etd,
    isCancelShipmentRowColour(v.rowColourStatus?.name)
  );
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
    isDelayed: isVehicleDelayed(status, v.eta),
  };
}

export async function getCustomerVehicleReport(orgId: string): Promise<CustomerVehicleReportData> {
  const vehicles = await prisma.vehicle.findMany({
    where: { org_id: orgId, deletedAt: null, serialPrefix: "FC", customerId: { not: null } },
    select: REPORT_VEHICLE_SELECT,
    orderBy: [{ serialNumber: "asc" }],
  });

  const groups = new Map<string, CustomerReportGroup>();

  for (const v of vehicles) {
    if (!v.customer) continue;
    const row = toReportVehicleRow(v);

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
        delayedCount: 0,
      };
      groups.set(v.customer.id, group);
    }

    group.vehicles.push(row);
    group.statusCounts[row.status]++;
    if (row.isDelayed) group.delayedCount++;
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

export async function getAuctionHallVehicleReport(orgId: string): Promise<AuctionHallVehicleReportData> {
  const vehicles = await prisma.vehicle.findMany({
    where: { org_id: orgId, deletedAt: null, serialPrefix: "FC", auctionHallId: { not: null } },
    select: REPORT_VEHICLE_SELECT,
    orderBy: [{ serialNumber: "asc" }],
  });

  const groups = new Map<string, AuctionHallReportGroup>();

  for (const v of vehicles) {
    if (!v.auctionHall) continue;
    const row = toReportVehicleRow(v);

    let group = groups.get(v.auctionHall.id);
    if (!group) {
      group = {
        auctionHallId: v.auctionHall.id,
        auctionHallName: v.auctionHall.name,
        vehicles: [],
        statusCounts: emptyStatusCounts(),
        delayedCount: 0,
      };
      groups.set(v.auctionHall.id, group);
    }

    group.vehicles.push(row);
    group.statusCounts[row.status]++;
    if (row.isDelayed) group.delayedCount++;
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

export async function getDestinationVehicleReport(orgId: string): Promise<DestinationVehicleReportData> {
  const vehicles = await prisma.vehicle.findMany({
    where: { org_id: orgId, deletedAt: null, serialPrefix: "FC", destination: { not: null } },
    select: REPORT_VEHICLE_SELECT,
    orderBy: [{ serialNumber: "asc" }],
  });

  const groups = new Map<string, DestinationReportGroup>();

  for (const v of vehicles) {
    if (!v.destination) continue;
    const row = toReportVehicleRow(v);

    let group = groups.get(v.destination);
    if (!group) {
      group = {
        destination: v.destination,
        vehicles: [],
        statusCounts: emptyStatusCounts(),
        delayedCount: 0,
      };
      groups.set(v.destination, group);
    }

    group.vehicles.push(row);
    group.statusCounts[row.status]++;
    if (row.isDelayed) group.delayedCount++;
  }

  const destinations = Array.from(groups.values()).sort((a, b) => a.destination.localeCompare(b.destination));
  const destinationOptions = destinations.map((d) => d.destination);

  return { destinations, destinationOptions };
}
