// Pure track-effective logic, same shape as lib/shipment-status.ts's
// computeEffectiveShipmentStatus — no Prisma, no server-only imports, so
// both the service layer and a client component could share it if ever
// needed. serialPrefix (and the serial string built from it) is permanent —
// re-numbering a vehicle would erase real history and complicate the
// per-prefix SerialCounter — but a vehicle can still need to *behave* like
// the other track from some point on. Today that only happens one direction
// (an FL vehicle that ends up being exported instead of sold locally), via
// Vehicle.convertedToExport.

import type { SerialPrefix } from "@prisma/client";

export function computeEffectiveTrack(serialPrefix: SerialPrefix, convertedToExport: boolean): SerialPrefix {
  return convertedToExport ? "FC" : serialPrefix;
}
