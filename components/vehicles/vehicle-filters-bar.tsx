"use client";

// Interactive toolbar above the vehicle table — search, FC/FL toggle, and the
// per-column filters (US-07/US-08). Every control just pushes a new URL; the
// table itself stays a plain server-rendered component driven by that URL,
// so there's no client-side data-fetching state to keep in sync here.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { cn } from "@/lib/utils";
import { buildVehiclesHref } from "@/lib/vehicle-list-url";
import { SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants/shipment-status";
import type { VehicleListParams } from "@/lib/services/vehicle.service";
import { VehicleFiltersPanel, type VehicleFilterSelections } from "@/components/vehicles/vehicle-filters-panel";
import { VehicleFilterChips } from "@/components/vehicles/vehicle-filter-chips";
import { searchCustomersAction } from "@/app/(dashboard)/vehicles/actions";

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
const SHIPMENT_STATUSES: ShipmentStatus[] = ["PENDING", "BOOKING_RECEIVED", "SHIPPED", "CANCELLED"];

/** Trigger label for the multi-select status dropdown — the full label when
 * exactly one status is picked (matches how the old single-select read),
 * otherwise a count so the trigger doesn't grow unbounded. */
function statusTriggerLabel(selected: ShipmentStatus[]): string {
  if (selected.length === 0) return "All statuses";
  if (selected.length === 1) return SHIPMENT_STATUS_META[selected[0]].label;
  return `${selected.length} statuses`;
}

export function VehicleFiltersBar({
  params,
  destinations,
  rowColourStatuses,
  selected,
}: VehicleFiltersBarProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(params.search);
  const isFirstRender = useRef(true);

  // Local copy of the selected statuses, kept in sync with the URL but
  // updated (and read from) synchronously on every click — never from
  // params.shipmentStatus directly. params only updates after a full server
  // round trip, so two clicks close together would otherwise each compute
  // their "next" array off the same stale params from before either
  // navigation landed, silently dropping the first pick. Local state updates
  // are applied before the next click can be handled (JS is single-threaded),
  // so building `next` off this instead lets every click navigate right away
  // — filtering live as you check boxes — without that race. Re-seeded from
  // params.shipmentStatus when the menu opens, so opening it after an
  // external change (browser back/forward) starts from what's actually in
  // the URL.
  const [selectedStatuses, setSelectedStatuses] = useState<ShipmentStatus[]>(params.shipmentStatus);

  function statusMenuOpenChange(open: boolean) {
    if (open) setSelectedStatuses(params.shipmentStatus);
  }

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

        <DropdownMenu onOpenChange={statusMenuOpenChange}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="h-8 w-full justify-between px-2.5 font-normal sm:w-[170px]"
              />
            }
          >
            <span className="truncate">{statusTriggerLabel(selectedStatuses)}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {SHIPMENT_STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={selectedStatuses.includes(status)}
                onCheckedChange={(checked) => {
                  // Reads selectedStatuses directly (not inside the setState
                  // call) — React invokes state-updater callbacks during its
                  // render phase, and calling router.push from in there trips
                  // "Cannot update a component while rendering a different
                  // component." selectedStatuses is safe to read straight
                  // from the closure here: it's local state, already current
                  // as of this render, unlike params (which lags a full
                  // round trip behind and caused the original race).
                  const next = checked
                    ? [...selectedStatuses, status]
                    : selectedStatuses.filter((s) => s !== status);
                  setSelectedStatuses(next);
                  router.push(buildVehiclesHref(params, { shipmentStatus: next, page: 1 }));
                }}
              >
                {SHIPMENT_STATUS_META[status].label}
              </DropdownMenuCheckboxItem>
            ))}
            {selectedStatuses.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    // Commits immediately, same as every other "clear" control
                    // on this page — doesn't rely on the subsequent
                    // onOpenChange(false) from this item's own closeOnClick,
                    // whose ordering relative to this onClick isn't guaranteed.
                    setSelectedStatuses([]);
                    router.push(buildVehiclesHref(params, { shipmentStatus: [], page: 1 }));
                  }}
                >
                  Clear statuses
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-full sm:w-[170px]">
          <FilterCombobox
            value={selected.customer}
            onChange={(option) =>
              router.push(buildVehiclesHref(params, { customerId: option?.id ?? "ALL", page: 1 }))
            }
            search={searchCustomersAction}
            placeholder="All customers"
            allLabel="All customers"
          />
        </div>

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
