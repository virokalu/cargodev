"use client";

// Interactive toolbar above the vehicle table — search, FC/FL toggle, and the
// per-column filters (US-07/US-08). Every control just pushes a new URL; the
// table itself stays a plain server-rendered component driven by that URL,
// so there's no client-side data-fetching state to keep in sync here.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buildVehiclesHref } from "@/lib/vehicle-list-url";
import { SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants/shipment-status";
import type { VehicleListParams } from "@/lib/services/vehicle.service";
import { VehicleFiltersPanel, type VehicleFilterSelections } from "@/components/vehicles/vehicle-filters-panel";
import { VehicleFilterChips } from "@/components/vehicles/vehicle-filter-chips";

interface RowColourStatusOption {
  id: string;
  name: string;
  colour: string;
}

interface VehicleFiltersBarProps {
  params: VehicleListParams;
  destinations: string[];
  rowColourStatuses: RowColourStatusOption[];
  selected: VehicleFilterSelections;
}

const DEBOUNCE_MS = 300;
const SHIPMENT_STATUSES: ShipmentStatus[] = ["PENDING", "BOOKING_RECEIVED", "SHIPPED"];

export function VehicleFiltersBar({
  params,
  destinations,
  rowColourStatuses,
  selected,
}: VehicleFiltersBarProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(params.search);
  const isFirstRender = useRef(true);

  // Debounced search-as-you-type — every other filter navigates immediately
  // since those are discrete clicks, not keystrokes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      router.push(buildVehiclesHref(params, { search: searchText, page: 1 }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by serial, chassis, auction item/lot no, brand/model/grade, or customer…"
            className="pl-9"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <Select
          value={params.shipmentStatus}
          onValueChange={(value) =>
            router.push(
              buildVehiclesHref(params, {
                shipmentStatus: value as ShipmentStatus | "ALL",
                page: 1,
              })
            )
          }
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            {/* Select.Value doesn't read a SelectItem's rendered children —
             * without this render function it prints the raw value
             * ("ALL"/"BOOKING_RECEIVED") instead of the friendly label. */}
            <SelectValue placeholder="All statuses">
              {(itemValue: string) =>
                itemValue === "ALL"
                  ? "All statuses"
                  : (SHIPMENT_STATUS_META[itemValue as ShipmentStatus]?.label ?? "All statuses")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" label="All statuses">
              All statuses
            </SelectItem>
            {SHIPMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status} label={SHIPMENT_STATUS_META[status].label}>
                {SHIPMENT_STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={params.destination}
          onValueChange={(value) =>
            router.push(buildVehiclesHref(params, { destination: value ?? "ALL", page: 1 }))
          }
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="All destinations">
              {(itemValue: string) => (itemValue === "ALL" ? "All destinations" : itemValue)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" label="All destinations">
              All destinations
            </SelectItem>
            {destinations.map((destination) => (
              <SelectItem key={destination} value={destination} label={destination}>
                {destination}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={params.rowColourStatusId}
          onValueChange={(value) =>
            router.push(buildVehiclesHref(params, { rowColourStatusId: value ?? "ALL", page: 1 }))
          }
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="All row colours">
              {(itemValue: string) =>
                itemValue === "ALL"
                  ? "All row colours"
                  : (rowColourStatuses.find((status) => status.id === itemValue)?.name ?? "All row colours")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="min-w-56">
            <SelectItem
              value="ALL"
              label="All row colours"
              hideIndicator
              className={cn(params.rowColourStatusId === "ALL" && "bg-muted")}
            >
              All row colours
            </SelectItem>
            {rowColourStatuses.map((status) => (
              <SelectItem
                key={status.id}
                value={status.id}
                label={status.name}
                hideIndicator
                // Selection shows as a tint of the status's own colour
                // instead of a checkmark crowding the text.
                style={
                  params.rowColourStatusId === status.id
                    ? { backgroundColor: `color-mix(in oklch, ${status.colour} 20%, transparent)` }
                    : undefined
                }
              >
                <span
                  className="mr-1.5 inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: status.colour }}
                />
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <VehicleFiltersPanel params={params} selected={selected} />
      </div>

      <div className="inline-flex gap-1 rounded-md bg-muted p-1">
        {(
          [
            { value: "ALL", label: "All" },
            { value: "FC", label: "FC — Export" },
            { value: "FL", label: "FL — Local" },
          ] as const
        ).map((track) => {
          const active = params.track === track.value;
          return (
            <button
              key={track.value}
              type="button"
              onClick={() =>
                router.push(
                  buildVehiclesHref(params, {
                    track: track.value as VehicleListParams["track"],
                    page: 1,
                  })
                )
              }
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
                active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={active}
            >
              {track.label}
            </button>
          );
        })}
      </div>

      <VehicleFilterChips params={params} selected={selected} />
    </div>
  );
}
