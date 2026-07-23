"use client";

// The 8 filters that don't fit in the inline toolbar row (Brand/Model/Grade,
// Auction Hall, Freight Agent, RORO/Container, Vehicle Location, and the 3
// tri-state flags) live behind a "Filters" button in a side panel, plus a row
// of removable chips under the toolbar for whatever's active. Customer isn't
// here — that list can get large, so narrowing by customer goes through the
// free-text search box instead of a dedicated filter dropdown.
// Every control still does the same immediate-navigate-on-change as the rest
// of the toolbar (lib/vehicle-list-url.ts buildVehiclesHref) — no separate
// "Apply" step to keep behaviour consistent across every filter on the page.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, ClipboardList, Filter, Truck, X } from "lucide-react";
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
import { SectionCard } from "@/components/shared/section-card";
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

        {/* overflow-y-auto forces overflow-x to clip too (CSS spec: neither
         * axis can stay "visible" once the other isn't) — that was cutting
         * off each SectionCard's ring border on the left/right edges. The
         * -m-1/p-1 pair gives the ring 4px of room to render in before
         * hitting this div's own clip box, while netting out to zero visual
         * shift (negative margin pulls the box out, padding pushes content
         * back in by the same amount). */}
        <div className="-m-1 flex-1 space-y-4 overflow-y-auto p-1">
          <SectionCard icon={Car} title="Vehicle Identity" contentClassName="space-y-3">
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
          </SectionCard>

          <SectionCard icon={Truck} title="Logistics" contentClassName="space-y-3">
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
          </SectionCard>

          <SectionCard icon={ClipboardList} title="Status Flags" contentClassName="space-y-3">
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
          </SectionCard>
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
