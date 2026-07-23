"use client";

// Selectable trend charts (§7.1, added post-spec — US-43). Not part of the
// original dashboard spec, so instead of adding 4 more permanent chart cards
// to an already-busy dashboard, these live behind a single segmented
// selector (same toggle pattern as the FC/FL/All track filter on the
// vehicles page) — only the chosen chart renders at a time.

import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { DashboardTrends } from "@/lib/services/dashboard.service";

interface DashboardTrendsCardProps {
  trends: DashboardTrends;
}

type TrendKey = "bookingsVsArrivals" | "vehiclesEntered" | "cumulativeGrowth" | "docsTurnaround";

const TREND_OPTIONS: { key: TrendKey; label: string }[] = [
  { key: "bookingsVsArrivals", label: "Bookings vs Arrivals" },
  { key: "vehiclesEntered", label: "Vehicles Entered" },
  { key: "cumulativeGrowth", label: "Cumulative Growth" },
  { key: "docsTurnaround", label: "Docs Turnaround" },
];

const bookingsVsArrivalsConfig = {
  bookings: { label: "Bookings (ETD)", color: "var(--chart-1)" },
  arrivals: { label: "Arrivals (ETA)", color: "var(--chart-2)" },
} satisfies ChartConfig;

const vehiclesEnteredConfig = {
  count: { label: "Vehicles Entered", color: "var(--chart-2)" },
} satisfies ChartConfig;

const cumulativeGrowthConfig = {
  total: { label: "Total Fleet Size", color: "var(--chart-1)" },
} satisfies ChartConfig;

const docsTurnaroundConfig = {
  avgDays: { label: "Avg Days (Purchase → Docs Arrived)", color: "var(--chart-4)" },
} satisfies ChartConfig;

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">{label}</div>
  );
}

// Shared renderer for all 4 trends — same shape (month on the x-axis, one
// or two numeric series), so one generic line chart replaces 4 near-
// identical copies.
function MonthlyLineChart<T extends { month: string }>({
  data,
  config,
  series,
}: {
  data: T[];
  config: ChartConfig;
  series: { key: Extract<keyof T, string>; color: string }[];
}) {
  if (data.length === 0) return <EmptyState label="Not enough data yet." />;

  return (
    <ChartContainer config={config} className="h-[280px] w-full">
      <LineChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((s) => (
          <Line key={s.key} dataKey={s.key} type="monotone" stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

export function DashboardTrendsCard({ trends }: DashboardTrendsCardProps) {
  const [selected, setSelected] = useState<TrendKey>("bookingsVsArrivals");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Trends</CardTitle>
          <div className="inline-flex flex-wrap gap-1 rounded-md bg-muted p-1">
            {TREND_OPTIONS.map((option) => {
              const active = selected === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelected(option.key)}
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
        {selected === "bookingsVsArrivals" && (
          <MonthlyLineChart
            data={trends.bookingsVsArrivals}
            config={bookingsVsArrivalsConfig}
            series={[
              { key: "bookings", color: bookingsVsArrivalsConfig.bookings.color },
              { key: "arrivals", color: bookingsVsArrivalsConfig.arrivals.color },
            ]}
          />
        )}
        {selected === "vehiclesEntered" && (
          <MonthlyLineChart
            data={trends.vehiclesEntered}
            config={vehiclesEnteredConfig}
            series={[{ key: "count", color: vehiclesEnteredConfig.count.color }]}
          />
        )}
        {selected === "cumulativeGrowth" && (
          <MonthlyLineChart
            data={trends.cumulativeGrowth}
            config={cumulativeGrowthConfig}
            series={[{ key: "total", color: cumulativeGrowthConfig.total.color }]}
          />
        )}
        {selected === "docsTurnaround" && (
          <MonthlyLineChart
            data={trends.docsTurnaround}
            config={docsTurnaroundConfig}
            series={[{ key: "avgDays", color: docsTurnaroundConfig.avgDays.color }]}
          />
        )}
      </CardContent>
    </Card>
  );
}
