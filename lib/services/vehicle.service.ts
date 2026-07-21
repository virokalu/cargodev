// Vehicle service — the single source of truth for creating a vehicle.
// Server Actions and (later) /api/* route handlers are thin wrappers that
// call this; nothing here is UI-specific (CLAUDE.md rule 2).

import type { Vehicle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";
import type { SessionUser } from "@/lib/services/auth-guard";
import {
  vehicleCreateSchema,
  flattenFieldErrors,
} from "@/lib/validation/vehicle.schema";
import { assignNextSerial, assignLegacySerial } from "@/lib/services/serial.service";
import * as activityLog from "@/lib/services/activity-log.service";

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
    const legacyStatus = input.isLegacyEntry && isFC ? input.shipmentStatus : null;
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
export async function hasDuplicateChassisNo(orgId: string, chassisNo: string): Promise<boolean> {
  const trimmed = chassisNo.trim();
  if (!trimmed) return false;
  const count = await prisma.vehicle.count({
    where: { org_id: orgId, chassisNo: { equals: trimmed, mode: "insensitive" } },
  });
  return count > 0;
}
