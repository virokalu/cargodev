// Vehicle files — auction sheet (single, replaceable), photos and documents
// (multi, append/delete). DB stores R2 URLs only, never binary (CLAUDE.md:
// Cloudflare R2 rule). Every mutator re-checks vehicle ownership and writes
// an ActivityLog entry in the same transaction, same shape as vehicle.service.ts.

import type { VehicleDocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/errors";
import type { SessionUser } from "@/lib/services/auth-guard";
import * as activityLog from "@/lib/services/activity-log.service";
import * as notificationService from "@/lib/services/notification.service";
import { deleteObject, keyFromPublicUrl } from "@/lib/r2";

/** Same shape as the deleted remark.service.ts's helper — exported because
 * the presign route needs the same ownership check before issuing a URL. */
export async function getOwnedVehicle(orgId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.org_id !== orgId || vehicle.deletedAt !== null) {
    throw new ServiceError("NOT_FOUND", "Vehicle not found.");
  }
  return vehicle;
}

export interface VehiclePhotoListItem {
  id: string;
  url: string;
  uploaderName: string;
  createdAt: Date;
}

export interface VehicleDocumentListItem {
  id: string;
  url: string;
  name: string;
  documentType: VehicleDocumentType;
  uploaderName: string;
  createdAt: Date;
}

export interface VehicleFiles {
  auctionSheetUrl: string | null;
  photos: VehiclePhotoListItem[];
  documents: VehicleDocumentListItem[];
}

export async function listVehicleFiles(orgId: string, vehicleId: string): Promise<VehicleFiles> {
  await getOwnedVehicle(orgId, vehicleId);
  const vehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { id: vehicleId },
    select: {
      auctionSheetUrl: true,
      photos: {
        select: { id: true, url: true, createdAt: true, uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        select: {
          id: true,
          url: true,
          name: true,
          documentType: true,
          createdAt: true,
          uploadedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    auctionSheetUrl: vehicle.auctionSheetUrl,
    photos: vehicle.photos.map((p) => ({
      id: p.id,
      url: p.url,
      uploaderName: p.uploadedBy.name,
      createdAt: p.createdAt,
    })),
    documents: vehicle.documents.map((d) => ({
      id: d.id,
      url: d.url,
      name: d.name,
      documentType: d.documentType,
      uploaderName: d.uploadedBy.name,
      createdAt: d.createdAt,
    })),
  };
}

/** Fetches the auction sheet + every photo's bytes server-side and returns
 * them as base64 data URLs, for the client-side PDF export (lib/vehicle-pdf
 * .ts). Deliberately does NOT take a raw URL from the caller — it re-derives
 * every URL itself from this vehicle's own files (already ownership-checked
 * via listVehicleFiles) so there's no way to trick this into fetching an
 * arbitrary attacker-supplied URL server-side (SSRF). A single failed fetch
 * (network hiccup, deleted R2 object) returns null for that one image rather
 * than failing the whole export — a partial PDF beats none. */
export interface VehiclePdfImages {
  auctionSheetDataUrl: string | null;
  photoDataUrls: string[];
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function getVehiclePdfImages(orgId: string, vehicleId: string): Promise<VehiclePdfImages> {
  const files = await listVehicleFiles(orgId, vehicleId);

  const [auctionSheetDataUrl, photoDataUrls] = await Promise.all([
    files.auctionSheetUrl ? fetchAsDataUrl(files.auctionSheetUrl) : Promise.resolve(null),
    Promise.all(files.photos.map((photo) => fetchAsDataUrl(photo.url))),
  ]);

  return {
    auctionSheetDataUrl,
    photoDataUrls: photoDataUrls.filter((url): url is string => url !== null),
  };
}

export async function setAuctionSheet(
  actor: SessionUser,
  vehicleId: string,
  url: string
): Promise<{ auctionSheetUrl: string }> {
  const vehicle = await getOwnedVehicle(actor.orgId, vehicleId);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.vehicle.update({ where: { id: vehicleId }, data: { auctionSheetUrl: url } });
    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "SET_AUCTION_SHEET",
      entity: "Vehicle",
      entityId: vehicleId,
      before: { auctionSheetUrl: vehicle.auctionSheetUrl },
      after: { auctionSheetUrl: url },
    });
    return updated;
  });

  // Best-effort cleanup of the replaced file — a storage-layer failure here
  // never blocks the user-visible replace, it just leaves a harmless
  // orphaned object.
  if (vehicle.auctionSheetUrl) {
    const oldKey = keyFromPublicUrl(vehicle.auctionSheetUrl);
    if (oldKey) deleteObject(oldKey).catch((e) => console.error("R2 delete failed", e));
  }

  return { auctionSheetUrl: result.auctionSheetUrl! };
}

// No per-photo notification here — a multi-file upload calls this once per
// file as each one finishes (components/shared/uploads/vehicle-photo-
// gallery.tsx runs every selected file as its own independent upload, since
// they can finish seconds apart), so emitting inside this function would
// mean "5 images uploaded" fans out as 5 separate "a photo was added"
// notifications. Still writes its own ActivityLog entry per photo (full
// audit granularity, unaffected by this) — only the *notification* is
// batched, via notifyPhotosAdded below, called once after every upload in
// a client-side batch has settled.
export async function addVehiclePhoto(
  actor: SessionUser,
  vehicleId: string,
  url: string
): Promise<VehiclePhotoListItem> {
  await getOwnedVehicle(actor.orgId, vehicleId);

  const photo = await prisma.$transaction(async (tx) => {
    const photo = await tx.vehiclePhoto.create({
      data: { vehicleId, url, uploadedById: actor.id },
      include: { uploadedBy: { select: { name: true } } },
    });
    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "ADD_VEHICLE_PHOTO",
      entity: "VehiclePhoto",
      entityId: photo.id,
      after: { url },
    });
    return photo;
  });

  return { id: photo.id, url: photo.url, uploaderName: photo.uploadedBy.name, createdAt: photo.createdAt };
}

/** One notification for a whole batch of photos added together (e.g. "5
 * photos added" instead of 5 separate pings) — called once by the client
 * after every upload in a batch has settled, not from inside
 * addVehiclePhoto itself. There's no single mutation to pair this
 * notification with atomically the way emit()'s own doc comment describes
 * (each photo in the batch is already its own independently-committed
 * mutation by the time this fires), so this just runs the same
 * list-recipients-then-emit steps addVehiclePhoto used to run inline, in
 * their own short transaction. No-ops for a batch where nothing actually
 * succeeded. */
export async function notifyPhotosAdded(actor: SessionUser, vehicleId: string, count: number): Promise<void> {
  if (count <= 0) return;
  const vehicle = await getOwnedVehicle(actor.orgId, vehicleId);

  const notification = await prisma.$transaction(async (tx) => {
    const recipientUserIds = await notificationService.listNotifiableStaffIds(tx, actor.orgId, actor.id);
    const notification: notificationService.EmitParams = {
      orgId: actor.orgId,
      event: "DOCUMENT_UPLOADED",
      title: count === 1 ? "Photo added" : "Photos added",
      body: `${actor.name} added ${count} ${count === 1 ? "photo" : "photos"} to ${vehicle.serial}.`,
      vehicleId,
      recipientUserIds,
    };
    await notificationService.emit(tx, notification);
    return notification;
  });

  notificationService.notifyRealtime(notification);
}

export async function deleteVehiclePhoto(actor: SessionUser, vehicleId: string, photoId: string): Promise<void> {
  await getOwnedVehicle(actor.orgId, vehicleId);
  const photo = await prisma.vehiclePhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.vehicleId !== vehicleId) {
    throw new ServiceError("NOT_FOUND", "Photo not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehiclePhoto.delete({ where: { id: photoId } });
    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "DELETE_VEHICLE_PHOTO",
      entity: "VehiclePhoto",
      entityId: photoId,
      before: { url: photo.url },
    });
  });

  const key = keyFromPublicUrl(photo.url);
  if (key) deleteObject(key).catch((e) => console.error("R2 delete failed", e));
}

export async function addVehicleDocument(
  actor: SessionUser,
  vehicleId: string,
  url: string,
  name: string,
  documentType: VehicleDocumentType
): Promise<VehicleDocumentListItem> {
  const vehicle = await getOwnedVehicle(actor.orgId, vehicleId);

  const { document, notification } = await prisma.$transaction(async (tx) => {
    const document = await tx.vehicleDocument.create({
      data: { vehicleId, url, name, documentType, uploadedById: actor.id },
      include: { uploadedBy: { select: { name: true } } },
    });
    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "ADD_VEHICLE_DOCUMENT",
      entity: "VehicleDocument",
      entityId: document.id,
      after: { url, name, documentType },
    });

    const recipientUserIds = await notificationService.listNotifiableStaffIds(tx, actor.orgId, actor.id);
    const notification: notificationService.EmitParams = {
      orgId: actor.orgId,
      event: "DOCUMENT_UPLOADED",
      title: "Document added",
      body: `${actor.name} added "${name}" to ${vehicle.serial}.`,
      vehicleId,
      recipientUserIds,
    };
    await notificationService.emit(tx, notification);

    return { document, notification };
  });

  notificationService.notifyRealtime(notification);
  return {
    id: document.id,
    url: document.url,
    name: document.name,
    documentType: document.documentType,
    uploaderName: document.uploadedBy.name,
    createdAt: document.createdAt,
  };
}

export async function deleteVehicleDocument(
  actor: SessionUser,
  vehicleId: string,
  documentId: string
): Promise<void> {
  await getOwnedVehicle(actor.orgId, vehicleId);
  const document = await prisma.vehicleDocument.findUnique({ where: { id: documentId } });
  if (!document || document.vehicleId !== vehicleId) {
    throw new ServiceError("NOT_FOUND", "Document not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicleDocument.delete({ where: { id: documentId } });
    await activityLog.record(tx, {
      orgId: actor.orgId,
      actorId: actor.id,
      action: "DELETE_VEHICLE_DOCUMENT",
      entity: "VehicleDocument",
      entityId: documentId,
      before: { url: document.url, name: document.name },
    });
  });

  const key = keyFromPublicUrl(document.url);
  if (key) deleteObject(key).catch((e) => console.error("R2 delete failed", e));
}
