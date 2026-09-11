// Pure track-effective logic, same shape as lib/shipment-status.ts's
// computeEffectiveShipmentStatus — no Prisma, no server-only imports, so
// both the service layer and a client component could share it if ever
// needed. serialPrefix (and the serial string built from it) is permanent —
// re-numbering a vehicle would erase real history and complicate the
// per-prefix SerialCounter — but a vehicle can still need to *behave* like
// the other track from some point on, in either direction: an FL vehicle
// that ends up being exported instead of sold locally (Vehicle.
// convertedToExport), or a native FC vehicle that ends up being sold
// locally instead of exported (Vehicle.convertedToLocal). The two flags
// are mutually exclusive in practice — convertedToExport only ever gets
// set on an FL-rooted row, convertedToLocal only ever on an FC-rooted one.

import type { SerialPrefix } from "@prisma/client";

export function computeEffectiveTrack(
  serialPrefix: SerialPrefix,
  convertedToExport: boolean,
  convertedToLocal: boolean
): SerialPrefix {
  if (convertedToExport) return "FC";
  if (convertedToLocal) return "FL";
  return serialPrefix;
}
