"use client";

// The 9 filters that don't fit in the inline toolbar row (Brand/Model/Grade,
// Auction Hall, Freight Agent, RORO/Container, Vehicle Location, Customer,
// and the 3 tri-state flags) live behind a "Filters" button in a side panel,
// plus a row of removable chips under the toolbar for whatever's active.
// Every control still does the same immediate-navigate-on-change as the rest
// of the toolbar (lib/vehicle-list-url.ts buildVehiclesHref) — no separate
// "Apply" step to keep behaviour consistent across every filter on the page.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { FilterCombobox, type FilterOption } from "@/components/shared/filter-combobox";
import { TriStateFilterSelect } from "@/components/vehicles/tri-state-filter-select";
import { buildVehiclesHref, VEHICLE_LIST_DEFAULTS } from "@/lib/vehicle-list-url";
import type { VehicleListParams } from "@/lib/services/vehicle.service";
import {
  searchBrandsAction,
  searchModelsAction,
  searchGradesAction,
  searchAuctionHallsAction,
  searchFreightAgentsAction,
  searchVehicleLocationsAction,
  searchCustomersAction,
} from "@/app/(dashboard)/vehicles/actions";

/** The panel-owned filter keys — used to compute the active-count badge and
 * what "Clear all" resets. Keeping this list in one place means the badge
 * count and the clear-all reset can never drift apart from each other. */
const PANEL_FILTER_KEYS = [
  "brandId",
  "modelId",
  "gradeId",
  "auctionHallId",
  "freightAgentId",
  "vehicleLocationId",
  "customerId",
  "shippingMethod",
  "auctionBillPaid",
  "logBook",
  "extraKey",
] as const satisfies readonly (keyof VehicleListParams)[];

export interface VehicleFilterSelections {
  brand: FilterOption | null;
  model: FilterOption | null;
  grade: FilterOption | null;
  auctionHall: FilterOption | null;
  freightAgent: FilterOption | null;
  vehicleLocation: FilterOption | null;
  customer: FilterOption | null;
}

interface VehicleFiltersPanelProps {
  params: VehicleListParams;
  selected: VehicleFilterSelections;
}

function countActive(params: VehicleListParams): number {
  return PANEL_FILTER_KEYS.filter((key) => params[key] !== VEHICLE_LIST_DEFAULTS[key]).length;
}

function clearAllOverrides(): Partial<VehicleListParams> {
  return Object.fromEntries(PANEL_FILTER_KEYS.map((key) => [key, VEHICLE_LIST_DEFAULTS[key]]));
}

export function VehicleFiltersPanel({ params, selected }: VehicleFiltersPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const activeCount = countActive(params);

  function push(overrides: Partial<VehicleListParams>) {
    router.push(buildVehiclesHref(params, { ...overrides, page: 1 }));
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <Filter className="size-4" />
        Filters
        {activeCount > 0 && <Badge variant="default">{activeCount}</Badge>}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Vehicle Identity</legend>
            <div>
              <Label className="mb-1.5">Brand</Label>
              <FilterCombobox
                value={selected.brand}
                onChange={(option) => push({ brandId: option?.id ?? "ALL", modelId: "ALL", gradeId: "ALL" })}
                search={(query) => searchBrandsAction(query)}
                placeholder="All brands"
                allLabel="All brands"
              />
            </div>
            <div>
              <Label className="mb-1.5">Model</Label>
              <FilterCombobox
                value={selected.model}
                onChange={(option) => push({ modelId: option?.id ?? "ALL", gradeId: "ALL" })}
                search={(query) =>
                  params.brandId !== "ALL" ? searchModelsAction(params.brandId, query) : Promise.resolve([])
                }
                placeholder="All models"
                allLabel="All models"
                disabled={params.brandId === "ALL"}
                disabledHint="Pick a brand first"
              />
            </div>
            <div>
              <Label className="mb-1.5">Grade</Label>
              <FilterCombobox
                value={selected.grade}
                onChange={(option) => push({ gradeId: option?.id ?? "ALL" })}
                search={(query) =>
                  params.modelId !== "ALL" ? searchGradesAction(params.modelId, query) : Promise.resolve([])
                }
                placeholder="All grades"
                allLabel="All grades"
                disabled={params.modelId === "ALL"}
                disabledHint="Pick a model first"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Logistics</legend>
            <div>
              <Label className="mb-1.5">Auction Hall</Label>
              <FilterCombobox
                value={selected.auctionHall}
                onChange={(option) => push({ auctionHallId: option?.id ?? "ALL" })}
                search={searchAuctionHallsAction}
                placeholder="All auction halls"
                allLabel="All auction halls"
              />
            </div>
            <div>
              <Label className="mb-1.5">Freight Agent</Label>
              <FilterCombobox
                value={selected.freightAgent}
                onChange={(option) => push({ freightAgentId: option?.id ?? "ALL" })}
                search={(query) => searchFreightAgentsAction(query)}
                placeholder="All freight agents"
                allLabel="All freight agents"
              />
            </div>
            <div>
              <Label className="mb-1.5">RORO / Container</Label>
              <Select
                value={params.shippingMethod}
                onValueChange={(value) =>
                  push({ shippingMethod: value as VehicleListParams["shippingMethod"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All">
                    {(itemValue: string) =>
                      itemValue === "ALL" ? "All" : itemValue === "RORO" ? "RORO" : "Container"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" label="All">All</SelectItem>
                  <SelectItem value="RORO" label="RORO">RORO</SelectItem>
                  <SelectItem value="CONTAINER" label="Container">Container</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Vehicle Location</Label>
              <FilterCombobox
                value={selected.vehicleLocation}
                onChange={(option) => push({ vehicleLocationId: option?.id ?? "ALL" })}
                search={searchVehicleLocationsAction}
                placeholder="All vehicle locations"
                allLabel="All vehicle locations"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">People</legend>
            <div>
              <Label className="mb-1.5">Customer</Label>
              <FilterCombobox
                value={selected.customer}
                onChange={(option) => push({ customerId: option?.id ?? "ALL" })}
                search={searchCustomersAction}
                placeholder="All customers"
                allLabel="All customers"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Status Flags</legend>
            <TriStateFilterSelect
              label="Auction Bill Paid"
              value={params.auctionBillPaid}
              onChange={(value) => push({ auctionBillPaid: value })}
            />
            <TriStateFilterSelect
              label="Log Book"
              value={params.logBook}
              onChange={(value) => push({ logBook: value })}
            />
            <TriStateFilterSelect
              label="Extra Key"
              value={params.extraKey}
              onChange={(value) => push({ extraKey: value })}
            />
          </fieldset>
        </div>

        <SheetFooter>
          <Button variant="outline" disabled={activeCount === 0} onClick={() => push(clearAllOverrides())}>
            <X className="size-4" />
            Clear all
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
