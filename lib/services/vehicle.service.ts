// Vehicle service — the single source of truth for creating a vehicle.
// Server Actions and (later) /api/* route handlers are thin wrappers that
// call this; nothing here is UI-specific (CLAUDE.md rule 2).

import type { Prisma, SerialPrefix, ShipmentStatus, ShippingMethod, Vehicle } from "@prisma/client";
// The raw Vehicle.shipmentStatus column only ever holds the 3 Prisma-enum
// values above. CANCELLED is a computed, FC-only, display-only status (see
// lib/shipment-status.ts) — fields that hold an *effective* status use this
// wider app-level type instead.
import type { ShipmentStatus as EffectiveShipmentStatus } from "@/lib/constants/shipment-status";
import { SHIPMENT_STATUS_ORDER } from "@/lib/constants/shipment-status";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";
import type { SessionUser } from "@/lib/services/auth-guard";
import {
  vehicleCreateSchema,
  vehicleUpdateSchema,
  flattenFieldErrors,
} from "@/lib/validation/vehicle.schema";
import { assignNextSerial, assignLegacySerial } from "@/lib/services/serial.service";
import * as activityLog from "@/lib/services/activity-log.service";
import {
  computeEffectiveShipmentStatus,
  computeShipmentStatusAfterEtdChange,
  deriveShipmentStatusFromEtd,
  isCancelShipmentRowColour,
  todayAtMidnight,
} from "@/lib/shipment-status";

export async function createVehicle(user: SessionUser, rawInput: unknown): Promise<Vehicle> {
  const parsed = vehicleCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please fix the highlighted fields.",
      flattenFieldErrors(parsed.error)
    );
  }
  const input = parsed.data;

  if (input.isLegacyEntry && input.legacySerialNumber == null) {
    throw new ServiceError("VALIDATION", "Legacy serial number is required.", {
      legacySerialNumber: "Enter the legacy serial number",
    });
  }
  const legacySerialNumber = input.legacySerialNumber;

  // FL vehicles never carry shipping fields — strip regardless of what was
  // posted (never trust the UI alone to have hidden them). Tech Doc §1 line 16.
  const isFC = input.track === "FC";
  const etd = isFC ? input.etd : null;
  const eta = isFC ? input.eta : null;
  const blNo = isFC ? input.blNo : null;
  const freightAgentId = isFC ? input.freightAgentId : null;
  const shippingMethod = isFC ? input.shippingMethod : null;
  const trackingNo = isFC ? input.trackingNo : null;
  // Packing agent only ever applies to Container shipments — same
  // strip-regardless-of-what-was-posted treatment as the fields above.
  const packingAgentId = shippingMethod === "CONTAINER" ? input.packingAgentId : null;

  // Freight agent capability re-check — server never trusts the client alone
  // to have filtered the RORO/Container options (CLAUDE.md rule 4).
  if (shippingMethod && freightAgentId) {
    const agent = await prisma.freightAgent.findUnique({ where: { id: freightAgentId } });
    if (!agent || agent.org_id !== user.orgId) {
      throw new ServiceError("VALIDATION", "Selected freight agent not found.", {
        freightAgentId: "Select a valid freight agent.",
      });
    }
    const agentOffersMethod = shippingMethod === "RORO" ? agent.offersRoro : agent.offersContainer;
    if (!agentOffersMethod) {
      throw new ServiceError(
        "VALIDATION",
        `${agent.name} does not offer ${shippingMethod === "RORO" ? "RORO" : "Container"} shipping.`,
        { shippingMethod: "This agent doesn't offer that method." }
      );
    }
  }

  // Packing agent is required for Container shipments — re-checked
  // server-side same as everything else the client only enforces in the UI.
  if (shippingMethod === "CONTAINER") {
    if (!packingAgentId) {
      throw new ServiceError("VALIDATION", "Packing agent is required for Container shipments.", {
        packingAgentId: "Select a packing agent.",
      });
    }
    const packingAgent = await prisma.packingAgent.findUnique({ where: { id: packingAgentId } });
    if (!packingAgent || packingAgent.org_id !== user.orgId) {
      throw new ServiceError("VALIDATION", "Selected packing agent not found.", {
        packingAgentId: "Select a valid packing agent.",
      });
    }
  }

  // Customer must resolve to a CUSTOMER-type user — reject staff IDs even
  // though the UI only ever lists customers (server refuses what the UI hides).
  if (input.customerId) {
    const customer = await prisma.user.findUnique({ where: { id: input.customerId } });
    if (!customer || customer.org_id !== user.orgId || customer.userType !== "CUSTOMER") {
      throw new ServiceError("VALIDATION", "Selected customer is not valid.", {
        customerId: "Select a valid customer.",
      });
    }
  }

  const vehicle = await prisma.$transaction(async (tx) => {
    const { serialNumber, serial } = input.isLegacyEntry
      ? await assignLegacySerial(tx, user.orgId, input.track, legacySerialNumber!)
      : await assignNextSerial(tx, user.orgId, input.track);

    // Shipment status is derived, never set manually (Tech Doc §1) — with one
    // documented exception: a legacy-serial FC record wasn't tracked through
    // the real ETD flow, so staff pick the status it actually reached instead
    // of every backfilled vehicle starting at a wrong "Pending". Everything
    // else still starts derived: a new FC vehicle created with an ETD already
    // filled in starts at Booking Received, not Pending — the rest of the
    // automation (revert on clear, daily cron to Shipped, computed-guard-on-
    // read) belongs to the separate shipment-status service that runs on
    // *edits*, not creation.
    const startsBookingReceived = isFC && etd !== null;
    let legacyStatus = input.isLegacyEntry && isFC ? input.shipmentStatus : null;
    // A legacy record can be hand-marked Pending or Booking Received even
    // though an ETD was also entered that contradicts it (e.g. Booking
    // Received picked but the ETD is already in the past — that vehicle
    // has shipped, whatever was picked). Re-derive from the ETD instead of
    // trusting a pick that doesn't match it, whenever an ETD is actually
    // present — but never override an explicit Shipped, and never touch
    // this when no ETD was entered at all (see deriveShipmentStatusFromEtd
    // for why this can't just be fixed later).
    if (legacyStatus && legacyStatus !== "SHIPPED" && etd !== null) {
      legacyStatus = deriveShipmentStatusFromEtd(etd);
    }
    const initialStatus = legacyStatus ?? (startsBookingReceived ? "BOOKING_RECEIVED" : "PENDING");

    const created = await tx.vehicle.create({
      data: {
        org_id: user.orgId,
        serialPrefix: input.track,
        serialNumber,
        serial,
        shipmentStatus: initialStatus,

        auctionItemNo: input.auctionItemNo,
        chassisNo: input.chassisNo,
        modelId: input.modelId,
        gradeId: input.gradeId,
        yom: input.yom,
        auctionHallId: input.auctionHallId,
        purchaseDate: input.purchaseDate,
        auctionLotNo: input.auctionLotNo,
        customerId: input.customerId,
        destination: input.destination,

        etd,
        eta,
        blNo,
        freightAgentId,
        shippingMethod,
        packingAgentId,
        trackingNo,

        transportById: input.transportById,
        vehicleLocationId: input.vehicleLocationId,
        massoDate: input.massoDate,
        billNumber: input.billNumber,
        lcNo: input.lcNo,
        docsArrivedDate: input.docsArrivedDate,

        auctionBillPaid: input.auctionBillPaid,
        logBook: input.logBook,
        extraKey: input.extraKey,
        nameChangeDeadline: input.nameChangeDeadline,
        rowColourStatusId: input.rowColourStatusId,
        docSentDate: input.docSentDate,
        docSentComment: input.docSentComment,
        recycleDate: input.recycleDate,
        jibaishake: input.jibaishake,
        vehicleRemark: input.vehicleRemark,
      },
    });

    if (legacyStatus && legacyStatus !== "PENDING") {
      await tx.statusHistory.create({
        data: {
          vehicleId: created.id,
          fromStatus: null,
          toStatus: legacyStatus,
          trigger: "LEGACY_ENTRY",
          triggeredBy: user.id,
        },
      });
    } else if (!legacyStatus && startsBookingReceived) {
      await tx.statusHistory.create({
        data: {
          vehicleId: created.id,
          fromStatus: null,
          toStatus: "BOOKING_RECEIVED",
          trigger: "ETD_SAVED",
          triggeredBy: user.id,
        },
      });
    }

    await activityLog.record(tx, {
      orgId: user.orgId,
      actorId: user.id,
      action: "CREATE_VEHICLE",
      entity: "Vehicle",
      entityId: created.id,
      // Snapshot through JSON to turn Date objects into plain ISO strings —
      // the ActivityLog.after column is Json, not a live Prisma model.
      after: JSON.parse(JSON.stringify(created)),
    });

    return created;
  });

  return vehicle;
}

/** Soft-warn only — legacy data may have real duplicate chassis numbers, so
 * this never blocks a save (Tech Doc §2, field 3). */
export async function hasDuplicateChassisNo(
  orgId: string,
  chassisNo: string,
  excludeId?: string
): Promise<boolean> {
  const trimmed = chassisNo.trim();
  if (!trimmed) return false;
  const count = await prisma.vehicle.count({
    where: {
      org_id: orgId,
      deletedAt: null,
      chassisNo: { equals: trimmed, mode: "insensitive" },
      // Editing a vehicle without touching its chassis number shouldn't flag
      // it as a duplicate of itself.
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return count > 0;
}

// ─────────────────────────────────────────────────────────────────────────
// Edit / delete (US-10/11) — serial, track, and the legacy manual-status
// override are creation-only (Tech Doc §3 + the "one documented exception"
// noted in createVehicle above); everything else can change here.
// ─────────────────────────────────────────────────────────────────────────

interface LookupRef {
  id: string;
  name: string;
}

export interface VehicleEditData {
  id: string;
  serial: string;
  track: SerialPrefix;
  shipmentStatus: EffectiveShipmentStatus;

  auctionItemNo: string | null;
  chassisNo: string | null;
  brand: LookupRef | null;
  model: LookupRef | null;
  grade: LookupRef | null;
  yom: number | null;
  auctionHall: LookupRef | null;
  purchaseDate: Date | null;
  auctionLotNo: string | null;
  customer: LookupRef | null;
  destination: string | null;

  etd: Date | null;
  eta: Date | null;
  blNo: string | null;
  freightAgent: (LookupRef & { offersRoro: boolean; offersContainer: boolean }) | null;
  shippingMethod: ShippingMethod | null;
  packingAgent: LookupRef | null;
  trackingNo: string | null;

  transportBy: LookupRef | null;
  vehicleLocation: LookupRef | null;
  massoDate: Date | null;
  billNumber: string | null;
  lcNo: string | null;
  docsArrivedDate: Date | null;

  auctionBillPaid: boolean | null;
  logBook: boolean | null;
  extraKey: boolean | null;
  nameChangeDeadline: Date | null;
  rowColourStatusId: string | null;
  docSentDate: Date | null;
  docSentComment: string | null;
  recycleDate: Date | null;
  jibaishake: string | null;
  vehicleRemark: string | null;
}

/** Fetches a vehicle shaped for the edit form. Returns null if it doesn't
 * exist or belongs to a different org (the edit page treats both as 404 —
 * never leak which org a given id belongs to). */
export async function getVehicleForEdit(orgId: string, id: string): Promise<VehicleEditData | null> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: {
      id: true,
      org_id: true,
      deletedAt: true,
      serial: true,
      serialPrefix: true,
      shipmentStatus: true,
      auctionItemNo: true,
      chassisNo: true,
      yom: true,
      purchaseDate: true,
      auctionLotNo: true,
      destination: true,
      etd: true,
      eta: true,
      blNo: true,
      shippingMethod: true,
      trackingNo: true,
      massoDate: true,
      billNumber: true,
      lcNo: true,
      docsArrivedDate: true,
      auctionBillPaid: true,
      logBook: true,
      extraKey: true,
      nameChangeDeadline: true,
      rowColourStatusId: true,
      docSentDate: true,
      docSentComment: true,
      recycleDate: true,
      jibaishake: true,
      vehicleRemark: true,
      model: { select: { id: true, name: true, brand: { select: { id: true, name: true } } } },
      grade: { select: { id: true, name: true } },
      auctionHall: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      freightAgent: { select: { id: true, name: true, offersRoro: true, offersContainer: true } },
      packingAgent: { select: { id: true, name: true } },
      transportBy: { select: { id: true, name: true } },
      vehicleLocation: { select: { id: true, name: true } },
      rowColourStatus: { select: { name: true } },
    },
  });

  if (!vehicle || vehicle.org_id !== orgId || vehicle.deletedAt !== null) return null;

  return {
    id: vehicle.id,
    serial: vehicle.serial,
    track: vehicle.serialPrefix,
    // Same "computed guard on read" the vehicles table uses (see
    // computeEffectiveShipmentStatus above) — without it, this page shows
    // the raw stored status, which reads BOOKING_RECEIVED until the daily
    // cron catches up, even right after saving an ETD that's already in
    // the past (which should read as SHIPPED immediately, same as the
    // table already shows). Same treatment for Cancelled — FC only.
    shipmentStatus: computeEffectiveShipmentStatus(
      vehicle.shipmentStatus,
      vehicle.etd,
      vehicle.serialPrefix === "FC" && isCancelShipmentRowColour(vehicle.rowColourStatus?.name)
    ),
    auctionItemNo: vehicle.auctionItemNo,
    chassisNo: vehicle.chassisNo,
    brand: vehicle.model?.brand ?? null,
    model: vehicle.model ? { id: vehicle.model.id, name: vehicle.model.name } : null,
    grade: vehicle.grade,
    yom: vehicle.yom,
    auctionHall: vehicle.auctionHall,
    purchaseDate: vehicle.purchaseDate,
    auctionLotNo: vehicle.auctionLotNo,
    customer: vehicle.customer,
    destination: vehicle.destination,
    etd: vehicle.etd,
    eta: vehicle.eta,
    blNo: vehicle.blNo,
    freightAgent: vehicle.freightAgent,
    shippingMethod: vehicle.shippingMethod,
    packingAgent: vehicle.packingAgent,
    trackingNo: vehicle.trackingNo,
    transportBy: vehicle.transportBy,
    vehicleLocation: vehicle.vehicleLocation,
    massoDate: vehicle.massoDate,
    billNumber: vehicle.billNumber,
    lcNo: vehicle.lcNo,
    docsArrivedDate: vehicle.docsArrivedDate,
    auctionBillPaid: vehicle.auctionBillPaid,
    logBook: vehicle.logBook,
    extraKey: vehicle.extraKey,
    nameChangeDeadline: vehicle.nameChangeDeadline,
    rowColourStatusId: vehicle.rowColourStatusId,
    docSentDate: vehicle.docSentDate,
    docSentComment: vehicle.docSentComment,
    recycleDate: vehicle.recycleDate,
    jibaishake: vehicle.jibaishake,
    vehicleRemark: vehicle.vehicleRemark,
  };
}

async function assertVehicleInOrg(orgId: string, id: string) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  // A soft-deleted vehicle is NOT_FOUND for every write path — same as one
  // that never existed or belongs to another org.
  if (!existing || existing.org_id !== orgId || existing.deletedAt !== null) {
    throw new ServiceError("NOT_FOUND", "Vehicle not found.");
  }
  return existing;
}

export async function updateVehicle(user: SessionUser, id: string, rawInput: unknown): Promise<Vehicle> {
  const existing = await assertVehicleInOrg(user.orgId, id);

  const parsed = vehicleUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServiceError(
      "VALIDATION",
      "Please fix the highlighted fields.",
      flattenFieldErrors(parsed.error)
    );
  }
  const input = parsed.data;

  // Track is fixed at creation — driven by the existing row, never the
  // client, same as createVehicle strips FL shipping fields regardless of
  // what's posted.
  const isFC = existing.serialPrefix === "FC";
  const etd = isFC ? input.etd : null;
  const eta = isFC ? input.eta : null;
  const blNo = isFC ? input.blNo : null;
  const freightAgentId = isFC ? input.freightAgentId : null;
  const shippingMethod = isFC ? input.shippingMethod : null;
  const trackingNo = isFC ? input.trackingNo : null;
  const packingAgentId = shippingMethod === "CONTAINER" ? input.packingAgentId : null;

  if (shippingMethod && freightAgentId) {
    const agent = await prisma.freightAgent.findUnique({ where: { id: freightAgentId } });
    if (!agent || agent.org_id !== user.orgId) {
      throw new ServiceError("VALIDATION", "Selected freight agent not found.", {
        freightAgentId: "Select a valid freight agent.",
      });
    }
    const agentOffersMethod = shippingMethod === "RORO" ? agent.offersRoro : agent.offersContainer;
    if (!agentOffersMethod) {
      throw new ServiceError(
        "VALIDATION",
        `${agent.name} does not offer ${shippingMethod === "RORO" ? "RORO" : "Container"} shipping.`,
        { shippingMethod: "This agent doesn't offer that method." }
      );
    }
  }

  if (shippingMethod === "CONTAINER") {
    if (!packingAgentId) {
      throw new ServiceError("VALIDATION", "Packing agent is required for Container shipments.", {
        packingAgentId: "Select a packing agent.",
      });
    }
    const packingAgent = await prisma.packingAgent.findUnique({ where: { id: packingAgentId } });
    if (!packingAgent || packingAgent.org_id !== user.orgId) {
      throw new ServiceError("VALIDATION", "Selected packing agent not found.", {
        packingAgentId: "Select a valid packing agent.",
      });
    }
  }

  if (input.customerId) {
    const customer = await prisma.user.findUnique({ where: { id: input.customerId } });
    if (!customer || customer.org_id !== user.orgId || customer.userType !== "CUSTOMER") {
      throw new ServiceError("VALIDATION", "Selected customer is not valid.", {
        customerId: "Select a valid customer.",
      });
    }
  }

  // ETD-driven status transition (Tech Doc §1) lives here by design — the
  // manual legacy-entry override only ever applies at creation time
  // (createVehicle above), never on a later edit.
  let nextStatus = existing.shipmentStatus;
  let statusTransition: { from: ShipmentStatus; to: ShipmentStatus; trigger: string } | null = null;

  if (isFC) {
    const hadEtd = existing.etd !== null;
    const hasEtd = etd !== null;
    nextStatus = computeShipmentStatusAfterEtdChange(existing.shipmentStatus, hadEtd, hasEtd);
    if (nextStatus !== existing.shipmentStatus) {
      statusTransition = {
        from: existing.shipmentStatus,
        to: nextStatus,
        trigger: nextStatus === "PENDING" ? "ETD_CLEARED" : "ETD_SAVED",
      };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.vehicle.update({
      where: { id },
      data: {
        auctionItemNo: input.auctionItemNo,
        chassisNo: input.chassisNo,
        modelId: input.modelId,
        gradeId: input.gradeId,
        yom: input.yom,
        auctionHallId: input.auctionHallId,
        purchaseDate: input.purchaseDate,
        auctionLotNo: input.auctionLotNo,
        customerId: input.customerId,
        destination: input.destination,

        etd,
        eta,
        blNo,
        freightAgentId,
        shippingMethod,
        packingAgentId,
        trackingNo,

        transportById: input.transportById,
        vehicleLocationId: input.vehicleLocationId,
        massoDate: input.massoDate,
        billNumber: input.billNumber,
        lcNo: input.lcNo,
        docsArrivedDate: input.docsArrivedDate,

        auctionBillPaid: input.auctionBillPaid,
        logBook: input.logBook,
        extraKey: input.extraKey,
        nameChangeDeadline: input.nameChangeDeadline,
        rowColourStatusId: input.rowColourStatusId,
        docSentDate: input.docSentDate,
        docSentComment: input.docSentComment,
        recycleDate: input.recycleDate,
        jibaishake: input.jibaishake,
        vehicleRemark: input.vehicleRemark,

        shipmentStatus: nextStatus,
      },
    });

    if (statusTransition) {
      await tx.statusHistory.create({
        data: {
          vehicleId: id,
          fromStatus: statusTransition.from,
          toStatus: statusTransition.to,
          trigger: statusTransition.trigger,
          triggeredBy: user.id,
        },
      });
    }

    await activityLog.record(tx, {
      orgId: user.orgId,
      actorId: user.id,
      action: "UPDATE_VEHICLE",
      entity: "Vehicle",
      entityId: id,
      before: JSON.parse(JSON.stringify(existing)),
      after: JSON.parse(JSON.stringify(result)),
    });

    return result;
  });

  return updated;
}

/** Soft delete — sets deletedAt instead of removing the row, so the serial
 * number is never reissued and the record stays recoverable. Every read
 * path (table, edit, chassis-dup check) filters deletedAt out, so a
 * soft-deleted vehicle behaves like it's gone everywhere it's used. */
export async function deleteVehicle(orgId: string, actorId: string, id: string): Promise<void> {
  const existing = await assertVehicleInOrg(orgId, id);

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.vehicle.update({ where: { id }, data: { deletedAt: new Date() } });
    await activityLog.record(tx, {
      orgId,
      actorId,
      action: "DELETE_VEHICLE",
      entity: "Vehicle",
      entityId: id,
      before: JSON.parse(JSON.stringify(existing)),
      after: JSON.parse(JSON.stringify(deleted)),
    });
  });
}

/** Quick inline-edit from the vehicle table — same validation/audit
 * guarantees as the full edit form, just for this one field. */
export async function updateVehicleRowColourStatus(
  orgId: string,
  actorId: string,
  id: string,
  rowColourStatusId: string | null
): Promise<void> {
  const existing = await assertVehicleInOrg(orgId, id);

  if (rowColourStatusId) {
    const status = await prisma.rowColourStatus.findUnique({ where: { id: rowColourStatusId } });
    if (!status || status.org_id !== orgId) {
      throw new ServiceError("VALIDATION", "Row colour status not found.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.update({ where: { id }, data: { rowColourStatusId } });
    await activityLog.record(tx, {
      orgId,
      actorId,
      action: "UPDATE_VEHICLE_ROW_COLOUR",
      entity: "Vehicle",
      entityId: id,
      before: { rowColourStatusId: existing.rowColourStatusId },
      after: { rowColourStatusId },
    });
  });
}

/** Quick inline-edit from the vehicle table — same validation/audit
 * guarantees as the full edit form, just for this one field. `null` is a
 * real, distinct value here (CLAUDE.md tri-state rule: "not entered yet"),
 * never coerced to false. */
export async function updateVehicleAuctionBillPaid(
  orgId: string,
  actorId: string,
  id: string,
  auctionBillPaid: boolean | null
): Promise<void> {
  const existing = await assertVehicleInOrg(orgId, id);

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.update({ where: { id }, data: { auctionBillPaid } });
    await activityLog.record(tx, {
      orgId,
      actorId,
      action: "UPDATE_VEHICLE_AUCTION_BILL_PAID",
      entity: "Vehicle",
      entityId: id,
      before: { auctionBillPaid: existing.auctionBillPaid },
      after: { auctionBillPaid },
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Vehicle list query layer (Tech Doc §1/§2, US-06/07/08) — powers the main
// vehicle table: FC/FL toggle, search, per-column filters, sort, pagination.
// ─────────────────────────────────────────────────────────────────────────

// FC vehicle whose row colour is the one that overrides shipment status to
// Cancelled — same condition computeEffectiveShipmentStatus checks, just
// expressed as a where-clause fragment so it can be reused as both the
// CANCELLED branch below and an exclusion on the other three branches.
const CANCELLED_WHERE: Prisma.VehicleWhereInput = {
  serialPrefix: "FC",
  rowColourStatus: { name: "Unit Canceled" },
};

/** Same effective-status guard as computeEffectiveShipmentStatus, expressed
 * as a Prisma where-clause instead of a post-fetch check — filtering by
 * status has to agree with what's actually displayed, or a vehicle whose
 * ETD has passed but the daily cron hasn't run yet would show as "Shipped"
 * everywhere while still matching a "Booking Received" filter (and being
 * excluded from a "Shipped" one). Cancelled works the same way: a vehicle
 * whose row colour marks it Cancelled must never also match Pending/Booking
 * Received/Shipped, even though its raw stored column still says one of
 * those. Each branch is self-contained (its own OR, not the top-level one)
 * so it composes safely inside an AND array alongside the free-text
 * search's own top-level OR in buildVehicleListWhere. */
function buildEffectiveShipmentStatusWhere(status: EffectiveShipmentStatus): Prisma.VehicleWhereInput {
  if (status === "CANCELLED") {
    return CANCELLED_WHERE;
  }

  if (status === "PENDING") {
    // The guard only ever promotes BOOKING_RECEIVED -> SHIPPED; it never
    // touches PENDING, so the raw column is already correct here — aside
    // from the Cancelled override, which still needs excluding.
    return { shipmentStatus: "PENDING", NOT: CANCELLED_WHERE };
  }

  const today = todayAtMidnight();

  if (status === "SHIPPED") {
    return {
      NOT: CANCELLED_WHERE,
      OR: [
        { shipmentStatus: "SHIPPED" },
        { shipmentStatus: "BOOKING_RECEIVED", etd: { lt: today } },
      ],
    };
  }

  // BOOKING_RECEIVED: genuinely still booking-received — not past its ETD
  // yet, otherwise the guard would show it as Shipped and this filter would
  // disagree with that. Also excludes Cancelled, same reasoning as above.
  return {
    shipmentStatus: "BOOKING_RECEIVED",
    NOT: CANCELLED_WHERE,
    OR: [{ etd: null }, { etd: { gte: today } }],
  };
}

export type VehicleListSortKey =
  | "serial"
  | "chassisNo"
  | "model"
  | "yom"
  | "shipmentStatus"
  | "purchaseDate"
  | "etd"
  | "eta"
  | "destination"
  | "docsArrivedDate"
  | "nameChangeDeadline"
  | "massoDate"
  | "docSentDate"
  | "recycleDate";

/** Tri-state filters need a 4th state beyond the field's own null/true/false —
 * "not filtering on this at all" is different from "filtering for blank"
 * (CLAUDE.md tri-state rule: null is a real, distinct value, never a stand-in
 * for "no filter applied"). */
export type TriStateFilterValue = "ALL" | "YES" | "NO" | "BLANK";

export interface VehicleListParams {
  page: number;
  pageSize: number;
  track: SerialPrefix | "ALL";
  search: string;
  shipmentStatus: EffectiveShipmentStatus | "ALL";
  destination: string | "ALL";
  rowColourStatusId: string | "ALL";
  /** Excludes one specific row colour status rather than filtering to it —
   * used by the dashboard's "In Progress" transport bar, which means
   * "everything except Transport Complete" (any other status, or none),
   * not "no colour set". Mutually exclusive with rowColourStatusId in
   * practice (nothing sets both), so if both were ever set, the equality
   * filter below takes precedence. */
  rowColourStatusIdNot: string | "ALL";
  brandId: string | "ALL";
  modelId: string | "ALL";
  gradeId: string | "ALL";
  auctionHallId: string | "ALL";
  freightAgentId: string | "ALL";
  packingAgentId: string | "ALL";
  vehicleLocationId: string | "ALL";
  transportById: string | "ALL";
  shippingMethod: ShippingMethod | "ALL";
  auctionBillPaid: TriStateFilterValue;
  logBook: TriStateFilterValue;
  extraKey: TriStateFilterValue;
  sortBy: VehicleListSortKey;
  sortDir: "asc" | "desc";
}

export interface VehicleListRow {
  id: string;
  serial: string;
  track: SerialPrefix;
  chassisNo: string | null;
  brandName: string | null;
  modelName: string | null;
  gradeName: string | null;
  yom: number | null;
  auctionItemNo: string | null;
  auctionHallName: string | null;
  auctionLotNo: string | null;
  purchaseDate: Date | null;
  customerName: string | null;
  destination: string | null;
  etd: Date | null;
  eta: Date | null;
  blNo: string | null;
  freightAgentName: string | null;
  shippingMethod: ShippingMethod | null;
  packingAgentName: string | null;
  trackingNo: string | null;
  transportByName: string | null;
  vehicleLocationName: string | null;
  auctionBillPaid: boolean | null;
  logBook: boolean | null;
  extraKey: boolean | null;
  docsArrivedDate: Date | null;
  nameChangeDeadline: Date | null;
  massoDate: Date | null;
  billNumber: string | null;
  lcNo: string | null;
  docSentDate: Date | null;
  docSentComment: string | null;
  recycleDate: Date | null;
  jibaishake: string | null;
  vehicleRemark: string | null;
  shipmentStatus: ShipmentStatus;
  effectiveShipmentStatus: EffectiveShipmentStatus;
  rowColourStatus: { id: string; name: string; colour: string; transportCellOnly: boolean } | null;
}

export interface VehicleListResult {
  rows: VehicleListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Same 3-branch mapping repeats for Auction Bill Paid/Log Book/Extra Key —
 * pulled out once rather than copy-pasted three times. */
function applyTriStateFilter(
  where: Prisma.VehicleWhereInput,
  field: "auctionBillPaid" | "logBook" | "extraKey",
  value: TriStateFilterValue
): void {
  if (value === "YES") where[field] = true;
  else if (value === "NO") where[field] = false;
  else if (value === "BLANK") where[field] = null;
}

function buildVehicleListWhere(orgId: string, params: VehicleListParams): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = { org_id: orgId, deletedAt: null };

  if (params.track !== "ALL") where.serialPrefix = params.track;
  if (params.shipmentStatus !== "ALL") {
    // Its own AND-array entry (not a direct where.shipmentStatus= equality)
    // so its internal OR doesn't collide with the free-text search's own
    // top-level where.OR below.
    where.AND = [buildEffectiveShipmentStatusWhere(params.shipmentStatus)];
  }
  if (params.destination !== "ALL") where.destination = params.destination;
  if (params.rowColourStatusId !== "ALL") {
    where.rowColourStatusId = params.rowColourStatusId;
  } else if (params.rowColourStatusIdNot !== "ALL") {
    where.rowColourStatusId = { not: params.rowColourStatusIdNot };
  }
  // Vehicle stores modelId/gradeId directly, but not brandId — brand is one
  // level up via the model relation.
  if (params.brandId !== "ALL") where.model = { brand_id: params.brandId };
  if (params.modelId !== "ALL") where.modelId = params.modelId;
  if (params.gradeId !== "ALL") where.gradeId = params.gradeId;
  if (params.auctionHallId !== "ALL") where.auctionHallId = params.auctionHallId;
  if (params.freightAgentId !== "ALL") where.freightAgentId = params.freightAgentId;
  if (params.packingAgentId !== "ALL") where.packingAgentId = params.packingAgentId;
  if (params.vehicleLocationId !== "ALL") where.vehicleLocationId = params.vehicleLocationId;
  if (params.transportById !== "ALL") where.transportById = params.transportById;
  if (params.shippingMethod !== "ALL") where.shippingMethod = params.shippingMethod;
  applyTriStateFilter(where, "auctionBillPaid", params.auctionBillPaid);
  applyTriStateFilter(where, "logBook", params.logBook);
  applyTriStateFilter(where, "extraKey", params.extraKey);

  // US-08: free-text search matches serial, chassis, auction item/lot no,
  // brand/model/grade, and customer name — everything else is a dedicated
  // per-column filter, not free text. Customer has no dedicated filter
  // dropdown (the customer list can get large — a plain dropdown or combobox
  // filter doesn't scale the way search-by-name does), so search is the only
  // way to narrow by customer.
  const search = params.search.trim();
  if (search) {
    where.OR = [
      { serial: { contains: search, mode: "insensitive" } },
      { chassisNo: { contains: search, mode: "insensitive" } },
      { auctionItemNo: { contains: search, mode: "insensitive" } },
      { auctionLotNo: { contains: search, mode: "insensitive" } },
      { model: { name: { contains: search, mode: "insensitive" } } },
      { model: { brand: { name: { contains: search, mode: "insensitive" } } } },
      { grade: { name: { contains: search, mode: "insensitive" } } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
}

function buildVehicleListOrderBy(
  sortBy: VehicleListSortKey,
  sortDir: "asc" | "desc"
): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sortBy) {
    case "serial":
      // serial is "FC" + a raw number, not zero-padded, so sorting the
      // display string alone would put "FC10" before "FC9" — sort the real
      // numeric column instead (grouped by prefix so FC/FL don't interleave).
      return [{ serialPrefix: sortDir }, { serialNumber: sortDir }];
    case "chassisNo":
      return [{ chassisNo: sortDir }];
    case "model":
      return [{ model: { name: sortDir } }];
    case "yom":
      return [{ yom: sortDir }];
    case "shipmentStatus":
      return [{ shipmentStatus: sortDir }];
    case "purchaseDate":
      return [{ purchaseDate: sortDir }];
    case "etd":
      return [{ etd: sortDir }];
    case "eta":
      return [{ eta: sortDir }];
    case "destination":
      return [{ destination: sortDir }];
    case "docsArrivedDate":
      return [{ docsArrivedDate: sortDir }];
    case "nameChangeDeadline":
      return [{ nameChangeDeadline: sortDir }];
    case "massoDate":
      return [{ massoDate: sortDir }];
    case "docSentDate":
      return [{ docSentDate: sortDir }];
    case "recycleDate":
      return [{ recycleDate: sortDir }];
  }
}

const VEHICLE_LIST_SELECT = {
  id: true,
  serial: true,
  serialPrefix: true,
  chassisNo: true,
  auctionItemNo: true,
  auctionLotNo: true,
  yom: true,
  purchaseDate: true,
  destination: true,
  etd: true,
  eta: true,
  blNo: true,
  shippingMethod: true,
  trackingNo: true,
  auctionBillPaid: true,
  logBook: true,
  extraKey: true,
  docsArrivedDate: true,
  nameChangeDeadline: true,
  massoDate: true,
  billNumber: true,
  lcNo: true,
  docSentDate: true,
  docSentComment: true,
  recycleDate: true,
  jibaishake: true,
  vehicleRemark: true,
  shipmentStatus: true,
  model: { select: { name: true, brand: { select: { name: true } } } },
  grade: { select: { name: true } },
  auctionHall: { select: { name: true } },
  customer: { select: { name: true } },
  freightAgent: { select: { name: true } },
  packingAgent: { select: { name: true } },
  transportBy: { select: { name: true } },
  vehicleLocation: { select: { name: true } },
  rowColourStatus: { select: { id: true, name: true, colour: true, transportCellOnly: true } },
} satisfies Prisma.VehicleSelect;

type VehicleListRawRow = Prisma.VehicleGetPayload<{ select: typeof VEHICLE_LIST_SELECT }>;

function toVehicleListRow(v: VehicleListRawRow): VehicleListRow {
  return {
    id: v.id,
    serial: v.serial,
    track: v.serialPrefix,
    chassisNo: v.chassisNo,
    brandName: v.model?.brand.name ?? null,
    modelName: v.model?.name ?? null,
    gradeName: v.grade?.name ?? null,
    yom: v.yom,
    auctionItemNo: v.auctionItemNo,
    auctionHallName: v.auctionHall?.name ?? null,
    auctionLotNo: v.auctionLotNo,
    purchaseDate: v.purchaseDate,
    customerName: v.customer?.name ?? null,
    destination: v.destination,
    etd: v.etd,
    eta: v.eta,
    blNo: v.blNo,
    freightAgentName: v.freightAgent?.name ?? null,
    shippingMethod: v.shippingMethod,
    packingAgentName: v.packingAgent?.name ?? null,
    trackingNo: v.trackingNo,
    transportByName: v.transportBy?.name ?? null,
    vehicleLocationName: v.vehicleLocation?.name ?? null,
    auctionBillPaid: v.auctionBillPaid,
    logBook: v.logBook,
    extraKey: v.extraKey,
    docsArrivedDate: v.docsArrivedDate,
    nameChangeDeadline: v.nameChangeDeadline,
    massoDate: v.massoDate,
    billNumber: v.billNumber,
    lcNo: v.lcNo,
    docSentDate: v.docSentDate,
    docSentComment: v.docSentComment,
    recycleDate: v.recycleDate,
    jibaishake: v.jibaishake,
    vehicleRemark: v.vehicleRemark,
    shipmentStatus: v.shipmentStatus,
    effectiveShipmentStatus: computeEffectiveShipmentStatus(
      v.shipmentStatus,
      v.etd,
      v.serialPrefix === "FC" && isCancelShipmentRowColour(v.rowColourStatus?.name)
    ),
    rowColourStatus: v.rowColourStatus,
  };
}

export async function listVehicles(
  orgId: string,
  params: VehicleListParams
): Promise<VehicleListResult> {
  const where = buildVehicleListWhere(orgId, params);
  const skip = (params.page - 1) * params.pageSize;

  // Shipment Status can't be sorted with a DB-level ORDER BY: the column
  // only ever holds the 3 storable values, but the table displays (and
  // this sort has to match) the *effective* status — also dependent on ETD
  // and the "Unit Canceled" row colour, a JS-computed value with no real
  // column behind it (see lib/shipment-status.ts). So this one sort key
  // fetches every matching row instead of a single DB page, sorts by the
  // same computeEffectiveShipmentStatus the table renders, then paginates
  // in memory. Fine at this app's scale (Phase 1, single org, 6-8 staff);
  // every other sort key still does a normal DB ORDER BY + LIMIT/OFFSET.
  if (params.sortBy === "shipmentStatus") {
    const [total, allVehicles] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({ where, select: VEHICLE_LIST_SELECT }),
    ]);
    const sortDirMultiplier = params.sortDir === "asc" ? 1 : -1;
    const rows = allVehicles
      .map(toVehicleListRow)
      .sort(
        (a, b) =>
          sortDirMultiplier *
          (SHIPMENT_STATUS_ORDER.indexOf(a.effectiveShipmentStatus) -
            SHIPMENT_STATUS_ORDER.indexOf(b.effectiveShipmentStatus))
      )
      .slice(skip, skip + params.pageSize);

    return {
      rows,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    };
  }

  const orderBy = buildVehicleListOrderBy(params.sortBy, params.sortDir);

  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      select: VEHICLE_LIST_SELECT,
    }),
  ]);

  const rows: VehicleListRow[] = vehicles.map(toVehicleListRow);

  return {
    rows,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

/** Distinct, non-null destinations actually in use — powers the Destination
 * filter dropdown so it only ever lists values that exist. */
export async function listDistinctDestinations(orgId: string): Promise<string[]> {
  const rows = await prisma.vehicle.findMany({
    where: { org_id: orgId, deletedAt: null, destination: { not: null } },
    select: { destination: true },
    distinct: ["destination"],
    orderBy: { destination: "asc" },
  });
  return rows.map((row) => row.destination).filter((d): d is string => d !== null);
}
