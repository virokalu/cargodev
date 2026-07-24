// Shared shipment-status display metadata — used by the Add Vehicle form
// (manual status picker for legacy records) and the vehicle table (status
// column). One source of truth so the colours never drift between screens.

export type ShipmentStatus = "PENDING" | "BOOKING_RECEIVED" | "SHIPPED";

export const SHIPMENT_STATUS_META: Record<
  ShipmentStatus,
  { label: string; badgeVariant: "warning" | "info" | "success" }
> = {
  PENDING: { label: "Pending", badgeVariant: "warning" },
  BOOKING_RECEIVED: { label: "Booking Received", badgeVariant: "info" },
  SHIPPED: { label: "Shipped", badgeVariant: "success" },
};
