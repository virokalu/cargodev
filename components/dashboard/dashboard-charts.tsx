"use client";

// The Recharts-based dashboard widgets (Tech Doc §7 / US-32, US-33, US-34,
// plus post-spec addition for RORO/Container). Vehicle Location, Transport
// By, Freight Agent, Export Volume by Destination and Brand all live in the
// switchable widget (dashboard-category-breakdown.tsx) instead of here —
// each can grow to many categories, so they get a horizontal bar chart
// behind a selector rather than a permanent card in this always-visible
// grid. Everything else on the dashboard (KPI cards, unpaid-bills list) is
// plain server-rendered JSX — only these need a client boundary, since
// Recharts itself is client-only.

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants/shipment-status";
import { ROTATING_CHART_COLORS } from "@/lib/constants/chart-colors";
import type { DashboardStats, IdNameCount } from "@/lib/services/dashboard.service";
import { useHoveredIndex, renderActivePieSlice, makeGrowingBarShape } from "@/components/dashboard/use-hovered-index";

interface DashboardChartsProps {
  stats: DashboardStats;
}

// FC/FL only has 2 slices, so it gets 2 deliberately far-apart colours
// (blue + green) instead of drawing the first two entries off the rotating
// palette, which put chart-1 and chart-2 next to each other — both sit in
// the blue/cyan family and read as near-identical in a 2-slice pie.
const trackConfig = {
  fc: { label: "FC — Export", color: "var(--chart-1)" },
  fl: { label: "FL — Local", color: "var(--chart-3)" },
} satisfies ChartConfig;

// Reuses the same semantic colours already used for the shipment-status
// badges elsewhere in the app (vehicles table, filters) — warning/info/
// success — instead of generic chart-N colours, so a status means the same
// colour everywhere it appears, not just on this one chart.
const STATUS_COLOR: Record<ShipmentStatus, string> = {
  PENDING: "var(--warning)",
  BOOKING_RECEIVED: "var(--info)",
  SHIPPED: "var(--success)",
};

const statusConfig = {
  PENDING: { label: SHIPMENT_STATUS_META.PENDING.label, color: STATUS_COLOR.PENDING },
  BOOKING_RECEIVED: { label: SHIPMENT_STATUS_META.BOOKING_RECEIVED.label, color: STATUS_COLOR.BOOKING_RECEIVED },
  SHIPPED: { label: SHIPMENT_STATUS_META.SHIPPED.label, color: STATUS_COLOR.SHIPPED },
} satisfies ChartConfig;

const transportConfig = {
  complete: { label: "Transport Complete", color: "var(--chart-2)" },
  inProgress: { label: "In Progress", color: "var(--chart-4)" },
} satisfies ChartConfig;

// RORO/Container is also only 2 slices — same reasoning as FC/FL, pick two
// colours far apart on the wheel instead of the rotating palette's first two.
const SHIPPING_METHOD_COLORS = ["var(--chart-2)", "var(--chart-4)"];


function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{label}</div>
  );
}

function PieLegend({ items }: { items: { name: string; value: number; fill: string }[] }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.fill }} />
          <span className="truncate text-muted-foreground">{item.name}</span>
          <span className="ml-auto font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// Used by every "vehicles grouped by a lookup's name" pie — currently just
// RORO/Container, but kept generic in case another small (2-4 category)
// breakdown needs a pie later. `colors` defaults to the rotating palette but
// can be overridden — a 2-slice pie reads much better with two deliberately
// distinct colours than the first two entries off a 5-colour rotation.
// `getHref`, if given, makes every slice clickable — it navigates to the
// vehicles table filtered to that slice; the hovered slice pops outward to
// signal it's the one that'll respond to a click.
function DistributionPie({
  title,
  data,
  emptyLabel,
  colors = ROTATING_CHART_COLORS,
  getHref,
}: {
  title: string;
  data: IdNameCount[];
  emptyLabel: string;
  colors?: string[];
  getHref?: (item: IdNameCount) => string;
}) {
  const router = useRouter();
  const chartData = data.map((d, i) => ({
    name: d.name,
    value: d.count,
    fill: colors[i % colors.length],
    href: getHref?.(d),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState label={emptyLabel} />
        ) : (
          <>
            <ChartContainer config={{}} className="mx-auto aspect-square max-h-[220px]">
              <PieChart accessibilityLayer={false}>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  strokeWidth={2}
                  activeShape={renderActivePieSlice}
                  onClick={(_, i) => {
                    const href = chartData[i]?.href;
                    if (href) router.push(href);
                  }}
                />
              </PieChart>
            </ChartContainer>
            <PieLegend items={chartData} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({ stats }: DashboardChartsProps) {
  const router = useRouter();
  const transportHover = useHoveredIndex();

  const trackData = [
    { name: trackConfig.fc.label, value: stats.trackSplit.fc, fill: trackConfig.fc.color, href: "/vehicles?track=FC" },
    { name: trackConfig.fl.label, value: stats.trackSplit.fl, fill: trackConfig.fl.color, href: "/vehicles?track=FL" },
  ].filter((d) => d.value > 0);

  const statusData = stats.shipmentStatusDistribution.map((s) => ({
    name: SHIPMENT_STATUS_META[s.status].label,
    value: s.count,
    fill: STATUS_COLOR[s.status],
    href: `/vehicles?status=${s.status}&track=FC`,
  }));

  const shippingMethodData: IdNameCount[] = stats.shippingMethodDistribution.map((s) => ({
    id: s.method,
    name: s.method === "RORO" ? "RORO" : "Container",
    count: s.count,
  }));

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Vehicles Tracked (FC vs FL)</CardTitle>
          </CardHeader>
          <CardContent>
            {trackData.length === 0 ? (
              <EmptyState label="No vehicles yet." />
            ) : (
              <>
                <ChartContainer config={trackConfig} className="mx-auto aspect-square max-h-[220px]">
                  <PieChart accessibilityLayer={false}>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={trackData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      strokeWidth={2}
                      activeShape={renderActivePieSlice}
                      onClick={(_, i) => router.push(trackData[i].href)}
                    />
                  </PieChart>
                </ChartContainer>
                <PieLegend items={trackData} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipment Status (FC)</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <EmptyState label="No FC vehicles yet." />
            ) : (
              <>
                <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-[220px]">
                  <PieChart accessibilityLayer={false}>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      strokeWidth={2}
                      activeShape={renderActivePieSlice}
                      onClick={(_, i) => router.push(statusData[i].href)}
                    />
                  </PieChart>
                </ChartContainer>
                <PieLegend items={statusData} />
              </>
            )}
          </CardContent>
        </Card>

        <DistributionPie
          title="RORO / Container"
          data={shippingMethodData}
          emptyLabel="No shipping method set yet."
          colors={SHIPPING_METHOD_COLORS}
          getHref={(item) => `/vehicles?method=${item.id}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transport Status by Company</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.transportByCompany.length === 0 ? (
            <EmptyState label="No vehicles assigned to a transport company yet." />
          ) : (
            <ChartContainer config={transportConfig} className="h-[280px] w-full">
              <BarChart data={stats.transportByCompany} margin={{ left: -16, right: 8 }} accessibilityLayer={false}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="company" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="complete"
                  fill="var(--color-complete)"
                  radius={[6, 6, 0, 0]}
                  shape={makeGrowingBarShape(transportHover.hoveredIndex, "vertical")}
                  onMouseEnter={(_, i) => transportHover.onEnter(i)}
                  onMouseLeave={transportHover.onLeave}
                  onClick={(_, i) => {
                    const entry = stats.transportByCompany[i];
                    router.push(
                      `/vehicles?transport=${entry.id}${stats.transportCompleteStatusId ? `&rowColour=${stats.transportCompleteStatusId}` : ""}`
                    );
                  }}
                />
                <Bar
                  dataKey="inProgress"
                  fill="var(--color-inProgress)"
                  radius={[6, 6, 0, 0]}
                  shape={makeGrowingBarShape(transportHover.hoveredIndex, "vertical")}
                  onMouseEnter={(_, i) => transportHover.onEnter(i)}
                  onMouseLeave={transportHover.onLeave}
                  onClick={(_, i) => router.push(`/vehicles?transport=${stats.transportByCompany[i].id}`)}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}
