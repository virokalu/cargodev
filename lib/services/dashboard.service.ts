// Dashboard stats — Tech Doc §7/§7.1, US-31 through US-35 and US-43. Every
// query is org-scoped and excludes soft-deleted vehicles, same as the
// vehicle list query layer (vehicle.service.ts).

import type { ShipmentStatus, ShippingMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeEffectiveShipmentStatus } from "@/lib/services/vehicle.service";

export interface NameCount {
  name: string;
  count: number;
}

// Shared by both KPI popups (Pending Shipping, Unpaid Auction Bills) — same
// three at-a-glance details either way: what the vehicle is, how old, and
// whose it is.
export interface VehicleSummary {
  id: string;
  serial: string;
  brand: string | null;
  model: string | null;
  yom: number | null;
  customerName: string | null;
}

export interface DashboardStats {
  totalVehicles: number;
  pendingFc: number;
  shippedFc: number;
  pendingVehicles: VehicleSummary[];
  trackSplit: { fc: number; fl: number };
  shipmentStatusDistribution: { status: ShipmentStatus; count: number }[];
  exportVolumeByDestination: { destination: string; count: number }[];
  transportByCompany: { company: string; complete: number; inProgress: number }[];
  vehicleLocationDistribution: NameCount[];
  transportByDistribution: NameCount[];
  freightAgentDistribution: NameCount[];
  shippingMethodDistribution: { method: ShippingMethod; count: number }[];
  brandDistribution: NameCount[];
  unpaidAuctionBills: VehicleSummary[];
}

const STATUS_ORDER: ShipmentStatus[] = ["PENDING", "BOOKING_RECEIVED", "SHIPPED"];

/** Shared by every "count vehicles grouped by a related lookup's name"
 * widget (Vehicle Location, Transport By, Freight Agent, Brand) — same
 * tally-then-sort shape each time, just fed a different relation's names. */
function tallyNames(names: (string | null | undefined)[]): NameCount[] {
  const tally = new Map<string, number>();
  for (const name of names) {
    if (!name) continue;
    tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  return Array.from(tally.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getDashboardStats(orgId: string): Promise<DashboardStats> {
  const baseWhere = { org_id: orgId, deletedAt: null };

  const [
    totalVehicles,
    trackGroups,
    fcStatusRows,
    exportDestinationGroups,
    transportRows,
    vehicleLocationRows,
    freightAgentRows,
    shippingMethodGroups,
    brandRows,
    unpaidBills,
  ] = await Promise.all([
    prisma.vehicle.count({ where: baseWhere }),
    prisma.vehicle.groupBy({ by: ["serialPrefix"], where: baseWhere, _count: true }),
    prisma.vehicle.findMany({
      where: { ...baseWhere, serialPrefix: "FC" },
      select: {
        id: true,
        serial: true,
        shipmentStatus: true,
        etd: true,
        yom: true,
        model: { select: { name: true, brand: { select: { name: true } } } },
        customer: { select: { name: true } },
      },
    }),
    prisma.vehicle.groupBy({
      by: ["destination"],
      where: { ...baseWhere, serialPrefix: "FC", destination: { not: null } },
      _count: true,
    }),
    prisma.vehicle.findMany({
      where: { ...baseWhere, transportById: { not: null } },
      select: {
        transportBy: { select: { name: true } },
        rowColourStatus: { select: { transportCellOnly: true } },
      },
    }),
    prisma.vehicle.findMany({
      where: { ...baseWhere, vehicleLocationId: { not: null } },
      select: { vehicleLocation: { select: { name: true } } },
    }),
    prisma.vehicle.findMany({
      where: { ...baseWhere, freightAgentId: { not: null } },
      select: { freightAgent: { select: { name: true } } },
    }),
    prisma.vehicle.groupBy({
      by: ["shippingMethod"],
      where: { ...baseWhere, shippingMethod: { not: null } },
      _count: true,
    }),
    prisma.vehicle.findMany({
      where: { ...baseWhere, modelId: { not: null } },
      select: { model: { select: { brand: { select: { name: true } } } } },
    }),
    prisma.vehicle.findMany({
      where: { ...baseWhere, OR: [{ auctionBillPaid: null }, { auctionBillPaid: false }] },
      select: {
        id: true,
        serial: true,
        yom: true,
        model: { select: { name: true, brand: { select: { name: true } } } },
        customer: { select: { name: true } },
      },
      orderBy: { serial: "asc" },
      take: 15,
    }),
  ]);

  const trackSplit = { fc: 0, fl: 0 };
  for (const group of trackGroups) {
    if (group.serialPrefix === "FC") trackSplit.fc = group._count;
    else trackSplit.fl = group._count;
  }

  // Shipment status is derived and has a known staleness window (the daily
  // cron hasn't flipped BOOKING_RECEIVED -> SHIPPED yet even though today is
  // past ETD) — the vehicle list corrects for this on read via
  // computeEffectiveShipmentStatus, so the dashboard counts do the same
  // instead of trusting the raw stored column.
  const statusTally: Record<ShipmentStatus, number> = {
    PENDING: 0,
    BOOKING_RECEIVED: 0,
    SHIPPED: 0,
  };
  const pendingVehicles: VehicleSummary[] = [];
  for (const row of fcStatusRows) {
    const effective = computeEffectiveShipmentStatus(row.shipmentStatus, row.etd);
    statusTally[effective]++;
    if (effective === "PENDING") {
      pendingVehicles.push({
        id: row.id,
        serial: row.serial,
        brand: row.model?.brand?.name ?? null,
        model: row.model?.name ?? null,
        yom: row.yom,
        customerName: row.customer?.name ?? null,
      });
    }
  }
  pendingVehicles.sort((a, b) => a.serial.localeCompare(b.serial));
  const shipmentStatusDistribution = STATUS_ORDER.map((status) => ({
    status,
    count: statusTally[status],
  })).filter((entry) => entry.count > 0);

  const exportVolumeByDestination = exportDestinationGroups
    .map((group) => ({ destination: group.destination as string, count: group._count }))
    .sort((a, b) => b.count - a.count);

  const transportTally = new Map<string, { complete: number; inProgress: number }>();
  for (const row of transportRows) {
    const company = row.transportBy?.name;
    if (!company) continue;
    const entry = transportTally.get(company) ?? { complete: 0, inProgress: 0 };
    if (row.rowColourStatus?.transportCellOnly) entry.complete++;
    else entry.inProgress++;
    transportTally.set(company, entry);
  }
  const transportByCompany = Array.from(transportTally.entries()).map(([company, counts]) => ({
    company,
    ...counts,
  }));

  const vehicleLocationDistribution = tallyNames(vehicleLocationRows.map((v) => v.vehicleLocation?.name));
  const transportByDistribution = tallyNames(transportRows.map((v) => v.transportBy?.name));
  const freightAgentDistribution = tallyNames(freightAgentRows.map((v) => v.freightAgent?.name));
  const brandDistribution = tallyNames(brandRows.map((v) => v.model?.brand?.name));

  const shippingMethodDistribution = shippingMethodGroups
    .map((group) => ({ method: group.shippingMethod as ShippingMethod, count: group._count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalVehicles,
    pendingFc: statusTally.PENDING,
    shippedFc: statusTally.SHIPPED,
    pendingVehicles,
    trackSplit,
    shipmentStatusDistribution,
    exportVolumeByDestination,
    transportByCompany,
    vehicleLocationDistribution,
    transportByDistribution,
    freightAgentDistribution,
    shippingMethodDistribution,
    brandDistribution,
    unpaidAuctionBills: unpaidBills.map((v) => ({
      id: v.id,
      serial: v.serial,
      brand: v.model?.brand?.name ?? null,
      model: v.model?.name ?? null,
      yom: v.yom,
      customerName: v.customer?.name ?? null,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Trend charts (§7.1) — added post-spec, US-43. Four selectable monthly
// time series, all bucketed in JS (Prisma has no native "group by month",
// and raw SQL is off the table per CLAUDE.md rule 3) via a "YYYY-MM" key.
// ─────────────────────────────────────────────────────────────────────────

export interface BookingsVsArrivalsPoint {
  month: string;
  bookings: number;
  arrivals: number;
}

export interface VehiclesEnteredPoint {
  month: string;
  count: number;
}

export interface CumulativeGrowthPoint {
  month: string;
  total: number;
}

export interface DocsTurnaroundPoint {
  month: string;
  avgDays: number;
}

export interface DashboardTrends {
  bookingsVsArrivals: BookingsVsArrivalsPoint[];
  vehiclesEntered: VehiclesEnteredPoint[];
  cumulativeGrowth: CumulativeGrowthPoint[];
  docsTurnaround: DocsTurnaroundPoint[];
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-05" -> "May 2026" — sorts correctly as a string (zero-padded month)
 * but reads naturally once resolved back to a label for the chart axis. */
function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export async function getDashboardTrends(orgId: string): Promise<DashboardTrends> {
  const baseWhere = { org_id: orgId, deletedAt: null };

  const [fcDateRows, createdRows, docsRows] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ...baseWhere, serialPrefix: "FC" },
      select: { etd: true, eta: true },
    }),
    prisma.vehicle.findMany({ where: baseWhere, select: { createdAt: true } }),
    prisma.vehicle.findMany({
      where: { ...baseWhere, purchaseDate: { not: null }, docsArrivedDate: { not: null } },
      select: { purchaseDate: true, docsArrivedDate: true },
    }),
  ]);

  // Bookings vs Arrivals — FC only, ETD month vs ETA month.
  const bookingsTally = new Map<string, number>();
  const arrivalsTally = new Map<string, number>();
  for (const row of fcDateRows) {
    if (row.etd) bookingsTally.set(monthKey(row.etd), (bookingsTally.get(monthKey(row.etd)) ?? 0) + 1);
    if (row.eta) arrivalsTally.set(monthKey(row.eta), (arrivalsTally.get(monthKey(row.eta)) ?? 0) + 1);
  }
  const bookingsArrivalsMonths = Array.from(
    new Set([...bookingsTally.keys(), ...arrivalsTally.keys()])
  ).sort();
  const bookingsVsArrivals = bookingsArrivalsMonths.map((key) => ({
    month: monthLabel(key),
    bookings: bookingsTally.get(key) ?? 0,
    arrivals: arrivalsTally.get(key) ?? 0,
  }));

  // Vehicles entered — all vehicles, by createdAt month.
  const enteredTally = new Map<string, number>();
  for (const row of createdRows) {
    const key = monthKey(row.createdAt);
    enteredTally.set(key, (enteredTally.get(key) ?? 0) + 1);
  }
  const enteredMonths = Array.from(enteredTally.keys()).sort();
  const vehiclesEntered = enteredMonths.map((key) => ({
    month: monthLabel(key),
    count: enteredTally.get(key) ?? 0,
  }));

  // Cumulative growth — same monthly counts as above, running total.
  let runningTotal = 0;
  const cumulativeGrowth = vehiclesEntered.map((point) => {
    runningTotal += point.count;
    return { month: point.month, total: runningTotal };
  });

  // Docs turnaround — average days from purchaseDate to docsArrivedDate,
  // bucketed by the month docs actually arrived in.
  const turnaroundTally = new Map<string, { totalDays: number; count: number }>();
  for (const row of docsRows) {
    const days = Math.round(
      (row.docsArrivedDate!.getTime() - row.purchaseDate!.getTime()) / (1000 * 60 * 60 * 24)
    );
    const key = monthKey(row.docsArrivedDate!);
    const entry = turnaroundTally.get(key) ?? { totalDays: 0, count: 0 };
    entry.totalDays += days;
    entry.count += 1;
    turnaroundTally.set(key, entry);
  }
  const turnaroundMonths = Array.from(turnaroundTally.keys()).sort();
  const docsTurnaround = turnaroundMonths.map((key) => {
    const entry = turnaroundTally.get(key)!;
    return { month: monthLabel(key), avgDays: Math.round(entry.totalDays / entry.count) };
  });

  return { bookingsVsArrivals, vehiclesEntered, cumulativeGrowth, docsTurnaround };
}
