"use client";

// Vehicle Location, Transport Company, Freight Agent, Export Volume by
// Destination and Brand all share one switchable widget (same segmented-
// selector pattern as DashboardTrendsCard) instead of five separate
// always-visible charts — every one of these can realistically grow to many
// categories over time, and a horizontal bar chart stays readable at any
// category count where a pie would turn into a wall of slivers and a
// vertical bar would need rotated, cramped axis labels.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { ROTATING_CHART_COLORS } from "@/lib/constants/chart-colors";
import type { IdNameCount } from "@/lib/services/dashboard.service";
import { useHoveredIndex, makeGrowingBarShape } from "@/components/dashboard/use-hovered-index";

interface DashboardCategoryBreakdownProps {
  vehicleLocationDistribution: IdNameCount[];
  transportByDistribution: IdNameCount[];
  freightAgentDistribution: IdNameCount[];
  exportVolumeByDestination: IdNameCount[];
  brandDistribution: IdNameCount[];
}

type CategoryKey = "location" | "transportBy" | "freightAgent" | "exportVolume" | "brand";

const CATEGORY_OPTIONS: { key: CategoryKey; label: string; emptyLabel: string }[] = [
  { key: "location", label: "Vehicle Location", emptyLabel: "No vehicle locations entered yet." },
  { key: "transportBy", label: "Transport Company", emptyLabel: "No transport company assigned yet." },
  { key: "freightAgent", label: "Freight Agent", emptyLabel: "No freight agent assigned yet." },
  { key: "exportVolume", label: "Export Volume by Destination", emptyLabel: "No FC export destinations yet." },
  { key: "brand", label: "Brand", emptyLabel: "No brands entered yet." },
];

// Each category's bar links to the vehicles table filtered by its own id —
// exportVolume is the one exception (destination has no lookup table, so
// page.tsx hands it a synthetic id equal to the destination name itself),
// which is why it needs the extra track=FC to scope it the same way the
// dashboard's own export-volume numbers are scoped (FC only).
const CATEGORY_LINK: Record<CategoryKey, { param: string; extraQuery?: Record<string, string> }> = {
  location: { param: "location" },
  transportBy: { param: "transport" },
  freightAgent: { param: "agent" },
  exportVolume: { param: "destination", extraQuery: { track: "FC" } },
  brand: { param: "brand" },
};

function buildCategoryHref(key: CategoryKey, id: string): string {
  const { param, extraQuery } = CATEGORY_LINK[key];
  const query = new URLSearchParams({ [param]: id, ...extraQuery });
  return `/vehicles?${query.toString()}`;
}

const config = { count: { label: "Vehicles", color: "var(--chart-2)" } } satisfies ChartConfig;

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">{label}</div>
  );
}

export function DashboardCategoryBreakdown({
  vehicleLocationDistribution,
  transportByDistribution,
  freightAgentDistribution,
  exportVolumeByDestination,
  brandDistribution,
}: DashboardCategoryBreakdownProps) {
  const router = useRouter();
  const hover = useHoveredIndex();
  const [selected, setSelected] = useState<CategoryKey>("location");

  const dataByCategory: Record<CategoryKey, IdNameCount[]> = {
    location: vehicleLocationDistribution,
    transportBy: transportByDistribution,
    freightAgent: freightAgentDistribution,
    exportVolume: exportVolumeByDestination,
    brand: brandDistribution,
  };
  const activeOption = CATEGORY_OPTIONS.find((option) => option.key === selected)!;
  const data = dataByCategory[selected];
  // Taller bars need more chart height, or the bars themselves get too thin
  // to read — scale with category count instead of a fixed height.
  const chartHeight = Math.max(220, data.length * 44);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Vehicles by Category</CardTitle>
          <div className="inline-flex flex-wrap gap-1 rounded-md bg-muted p-1">
            {CATEGORY_OPTIONS.map((option) => {
              const active = selected === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setSelected(option.key);
                    hover.onLeave();
                  }}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
                    active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState label={activeOption.emptyLabel} />
        ) : (
          <ChartContainer config={config} className="w-full" style={{ height: chartHeight }}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }} accessibilityLayer={false}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={140}
                fontSize={11}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                radius={[0, 6, 6, 0]}
                shape={makeGrowingBarShape(
                  hover.hoveredIndex,
                  "horizontal",
                  (i) => ROTATING_CHART_COLORS[i % ROTATING_CHART_COLORS.length]
                )}
                onMouseEnter={(_, i) => hover.onEnter(i)}
                onMouseLeave={hover.onLeave}
                onClick={(_, i) => router.push(buildCategoryHref(selected, data[i].id))}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
