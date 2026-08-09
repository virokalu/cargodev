// Operational shipment milestones for the vehicle detail page's Shipment
// Timeline (distinct from ShipmentStatus/StatusHistory — those track the 3
// stored Pending/Booking Received/Shipped values used everywhere else in
// the app: table, dashboard, filters, badges. This is a separate, richer
// progress view specific to the detail page, derived purely from fields
// already on the vehicle — no DB read of its own, no write path, nothing
// stored. Who/when changed each field is a future "auth log" feature
// (StatusHistory-adjacent, not built yet) — this only tracks *whether* and
// *when the underlying date field says* each step happened.
//
// Pure + framework-agnostic like lib/shipment-status.ts, so both the
// server page and (if ever needed) a client preview can share it.

import { todayAtMidnight } from "@/lib/shipment-status";

export type ShipmentMilestoneKey =
  | "AUCTION_BILL_PAID"
  | "TRANSPORT_ASSIGNED"
  | "EC_RECEIVED"
  | "LC_OPEN"
  | "BOOKING_RECEIVED"
  | "LOADED"
  | "SHIPPED"
  | "DELIVERED";

export interface ShipmentMilestone {
  key: ShipmentMilestoneKey;
  label: string;
  completed: boolean;
  /** The date this milestone actually completed, when known — null while
   * not yet completed, and also null for the two flag-based steps
   * (Auction Bill Paid, Transport Assigned) since neither has its own
   * dated column, just a value that's set or not. */
  date: Date | null;
}

export interface ShipmentMilestoneInput {
  auctionBillPaid: boolean | null;
  transportBy: { id: string; name: string } | null;
  lcNo: string | null;
  etd: Date | null;
  eta: Date | null;
  destination: string | null;
  /** Unlike every other field here, this doesn't live on Vehicle directly —
   * it's the earliest createdAt among the vehicle's EC-type VehicleDocument
   * rows (documentType "EC"), resolved by the caller. Completed the moment
   * an EC is uploaded, same shape as etd/eta: null = not yet, a Date = when. */
  ecReceivedAt: Date | null;
}

// LC Open only applies when shipping to Sri Lanka or Bangladesh — matches
// world-countries' common names, the same strings the Destination field's
// CountrySelect stores (see lib/constants/countries.ts).
const LC_OPEN_DESTINATIONS = new Set(["Sri Lanka", "Bangladesh"]);

/** EC Received sits between Transport Assigned and Booking Received in the
 * real physical process — completed the moment an EC-type document is
 * uploaded (see ShipmentMilestoneInput.ecReceivedAt). */
export function buildShipmentMilestones(input: ShipmentMilestoneInput): ShipmentMilestone[] {
  const today = todayAtMidnight();
  const etdPassed = input.etd !== null && input.etd.getTime() < today.getTime();
  const etaPassed = input.eta !== null && input.eta.getTime() < today.getTime();

  const milestones: ShipmentMilestone[] = [
    { key: "AUCTION_BILL_PAID", label: "Auction Bill Paid", completed: input.auctionBillPaid === true, date: null },
    { key: "TRANSPORT_ASSIGNED", label: "Rikso Given", completed: input.transportBy !== null, date: null },
    {
      key: "EC_RECEIVED",
      label: "EC Received",
      completed: input.ecReceivedAt !== null,
      date: input.ecReceivedAt,
    },
  ];

  if (input.destination && LC_OPEN_DESTINATIONS.has(input.destination)) {
    milestones.push({ key: "LC_OPEN", label: "LC Open", completed: !!input.lcNo, date: null });
  }

  milestones.push(
    { key: "BOOKING_RECEIVED", label: "Booking Received", completed: input.etd !== null, date: input.etd },
    // Loaded and Shipped share the same trigger (ETD passing) — there's no
    // separate "loaded" date field yet to tell the two apart, so both
    // complete at once until one exists.
    { key: "LOADED", label: "Loaded", completed: etdPassed, date: etdPassed ? input.etd : null },
    { key: "SHIPPED", label: "Shipped", completed: etdPassed, date: etdPassed ? input.etd : null },
    { key: "DELIVERED", label: "Delivered", completed: etaPassed, date: etaPassed ? input.eta : null }
  );

  return milestones;
}
