"use client";

// Removable "pill" row for whichever panel-owned filters (vehicle-filters-
// panel.tsx) are currently active — lets staff see and clear one filter at a
// time without opening the panel back up.

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { buildVehiclesHref } from "@/lib/vehicle-list-url";
import type { TriStateFilterValue, VehicleListParams } from "@/lib/services/vehicle.service";
import type { VehicleFilterSelections } from "@/components/vehicles/vehicle-filters-panel";

interface VehicleFilterChipsProps {
  params: VehicleListParams;
  selected: VehicleFilterSelections;
}

const TRI_STATE_LABELS: Record<TriStateFilterValue, string> = {
  ALL: "All",
  YES: "Yes",
  NO: "No",
  BLANK: "Not entered",
};

export function VehicleFilterChips({ params, selected }: VehicleFilterChipsProps) {
  const router = useRouter();

  const chips: { key: string; label: string; clear: Partial<VehicleListParams> }[] = [];

  if (selected.brand) chips.push({ key: "brand", label: `Brand: ${selected.brand.name}`, clear: { brandId: "ALL", modelId: "ALL", gradeId: "ALL" } });
  if (selected.model) chips.push({ key: "model", label: `Model: ${selected.model.name}`, clear: { modelId: "ALL", gradeId: "ALL" } });
  if (selected.grade) chips.push({ key: "grade", label: `Grade: ${selected.grade.name}`, clear: { gradeId: "ALL" } });
  if (selected.auctionHall) chips.push({ key: "hall", label: `Auction Hall: ${selected.auctionHall.name}`, clear: { auctionHallId: "ALL" } });
  if (selected.freightAgent) chips.push({ key: "agent", label: `Freight Agent: ${selected.freightAgent.name}`, clear: { freightAgentId: "ALL" } });
  if (selected.vehicleLocation) chips.push({ key: "location", label: `Vehicle Location: ${selected.vehicleLocation.name}`, clear: { vehicleLocationId: "ALL" } });
  if (selected.customer) chips.push({ key: "customer", label: `Customer: ${selected.customer.name}`, clear: { customerId: "ALL" } });
  if (params.shippingMethod !== "ALL") {
    chips.push({
      key: "method",
      label: `Method: ${params.shippingMethod === "RORO" ? "RORO" : "Container"}`,
      clear: { shippingMethod: "ALL" },
    });
  }
  if (params.auctionBillPaid !== "ALL") {
    chips.push({
      key: "billPaid",
      label: `Auction Bill Paid: ${TRI_STATE_LABELS[params.auctionBillPaid]}`,
      clear: { auctionBillPaid: "ALL" },
    });
  }
  if (params.logBook !== "ALL") {
    chips.push({ key: "logBook", label: `Log Book: ${TRI_STATE_LABELS[params.logBook]}`, clear: { logBook: "ALL" } });
  }
  if (params.extraKey !== "ALL") {
    chips.push({
      key: "extraKey",
      label: `Extra Key: ${TRI_STATE_LABELS[params.extraKey]}`,
      clear: { extraKey: "ALL" },
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => router.push(buildVehiclesHref(params, { ...chip.clear, page: 1 }))}
          className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70"
        >
          {chip.label}
          <X className="size-3" />
        </button>
      ))}
    </div>
  );
}
