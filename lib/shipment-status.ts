// Pure ETD-driven shipment status logic (Tech Doc §1) — no Prisma, no
// server-only imports, so both lib/services/vehicle.service.ts (the real
// source of truth on save) and components/vehicles/vehicle-form.tsx (a
// client component, for a live preview *before* saving) can import the
// exact same logic instead of two hand-kept-in-sync copies.

import type { ShipmentStatus, StorableShipmentStatus } from "@/lib/constants/shipment-status";

/** The one row colour status that overrides shipment status to Cancelled
 * (FC only — see computeEffectiveShipmentStatus). Matched by name against
 * the existing seeded "Unit Canceled" row colour status — there's no
 * separate flag or DB column for this, same as how "Transport Complete"
 * is its own special-cased name for the transportCellOnly behaviour. */
const CANCEL_SHIPMENT_ROW_COLOUR_NAME = "Unit Canceled";

export function isCancelShipmentRowColour(rowColourStatusName: string | null | undefined): boolean {
  return rowColourStatusName === CANCEL_SHIPMENT_ROW_COLOUR_NAME;
}

export function todayAtMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** "Computed guard on read" (Tech Doc §1): the daily cron flips
 * BOOKING_RECEIVED -> SHIPPED once today is after the ETD date, but if the
 * cron hasn't run yet today the UI would show a stale status. This never
 * writes to the DB — it's purely what gets displayed until the cron (or an
 * edit that changes ETD) catches up for real.
 *
 * `cancelled` works the same way: true whenever the vehicle is FC and its
 * current row colour status is "Unit Canceled" — never stored, purely
 * computed, and immediately reactive to changing the row colour away from
 * it (callers pass `false` for FL vehicles, since shipment status isn't
 * tracked for FL at all). */
export function computeEffectiveShipmentStatus(
  status: StorableShipmentStatus,
  etd: Date | null,
  cancelled: boolean
): ShipmentStatus {
  if (cancelled) return "CANCELLED";
  if (status !== "BOOKING_RECEIVED" || !etd) return status;
  return etd.getTime() < todayAtMidnight().getTime() ? "SHIPPED" : status;
}

/** ETD-driven status transition on edit (Tech Doc §1): adding an ETD to a
 * Pending FC vehicle moves it to Booking Received; clearing an ETD always
 * reverts to Pending, regardless of current status. Editing ETD to a
 * different (but still present) date doesn't itself transition anything —
 * computeEffectiveShipmentStatus handles the "already in the past" case on
 * top of whatever this returns. Mirrors vehicle.service.ts#updateVehicle's
 * transition exactly, so a live client-side preview and the actual save
 * can never disagree. */
export function computeShipmentStatusAfterEtdChange(
  currentStatus: StorableShipmentStatus,
  hadEtd: boolean,
  hasEtd: boolean
): StorableShipmentStatus {
  if (!hadEtd && hasEtd && currentStatus === "PENDING") return "BOOKING_RECEIVED";
  if (hadEtd && !hasEtd) return "PENDING";
  return currentStatus;
}
