// app/dashboard/page.tsx
"use client";

import Link from "next/link";
import {
  Car,
  Clock,
  Ship,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Bell,
  FileWarning,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/ui/statcard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  dashboardMetrics,
  monthlyTrends,
  statusDistribution,
  destinationBreakdown,
  recentActivity,
  notifications,
} from "@/lib/mock-data";

const trendsConfig = {
  shipped: { label: "Shipped", color: "var(--chart-1)" },
  arrived: { label: "Arrived", color: "var(--chart-3)" },
} satisfies ChartConfig;

const destinationsConfig = {
  value: { label: "Vehicles", color: "var(--chart-2)" },
} satisfies ChartConfig;

// One chart-N slot per status so the pie + legend can pull color and label
// straight from config, the way shadcn charts are meant to be driven.
// Keys are slugs (no spaces) because CSS custom property names can't
// contain whitespace — "In Transit" -> "in_transit".
const statusConfig = {
  pending: { label: "Pending", color: "var(--chart-4)" },
  shipped: { label: "Shipped", color: "var(--chart-2)" },
  in_transit: { label: "In Transit", color: "var(--chart-1)" },
  arrived: { label: "Arrived", color: "var(--chart-3)" },
  delayed: { label: "Delayed", color: "var(--destructive)" },
  customs_hold: { label: "Customs Hold", color: "var(--chart-5)" },
} satisfies ChartConfig;

function statusSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "_");
}

export default function DashboardPage() {
  const m = dashboardMetrics();
  const status = statusDistribution()
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, fill: `var(--color-${statusSlug(s.name)})` }));
  const dest = destinationBreakdown();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your vehicle shipping operations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Vehicles" value={m.total} icon={Car} trend={12} tone="primary" />
        <StatCard label="Pending Shipments" value={m.pending} icon={Clock} trend={-4} tone="warning" />
        <StatCard label="Shipped" value={m.shipped} icon={Ship} trend={8} tone="info" />
        <StatCard label="In Transit" value={m.inTransit} icon={Navigation} trend={5} tone="info" />
        <StatCard label="Arrived" value={m.arrived} icon={CheckCircle2} trend={15} tone="success" />
        <StatCard label="Delayed" value={m.delayed} icon={AlertTriangle} trend={-2} tone="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Shipment Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendsConfig} className="h-[300px] w-full">
              <AreaChart data={monthlyTrends} margin={{ left: -16, right: 8 }}>
                <defs>
                  <linearGradient id="fillShipped" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-shipped)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-shipped)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillArrived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-arrived)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-arrived)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey="shipped"
                  type="monotone"
                  fill="url(#fillShipped)"
                  stroke="var(--color-shipped)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="arrived"
                  type="monotone"
                  fill="url(#fillArrived)"
                  stroke="var(--color-arrived)"
                  strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-[260px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={status} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} strokeWidth={2}>
                  {status.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              {status.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                  <span className="truncate text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Destinations by Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={destinationsConfig} className="h-[280px] w-full">
              <BarChart data={dest} margin={{ left: -16, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4" /> Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.slice(0, 4).map((n) => (
              <div key={n.id} className="flex gap-3 rounded-lg border p-3">
                <div className="mt-0.5">
                  {n.category === "Document" ? (
                    <FileWarning className="size-4 text-warning" />
                  ) : n.title.includes("Delayed") ? (
                    <AlertTriangle className="size-4 text-destructive" />
                  ) : (
                    <Ship className="size-4 text-info" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <Badge variant="outline" className="ml-auto shrink-0">
                      {n.category}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">{n.time}</p>
                </div>
              </div>
            ))}
            <Link
              href="/notifications"
              className="block text-center text-sm font-medium text-primary hover:underline"
            >
              View all notifications
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentActivity.map((a, i) => (
            <div key={a.id}>
              <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-secondary text-xs">
                    {a.user.split(" ").map((p) => p[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm">
                  <span className="font-medium">{a.user}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>{" "}
                  <span className="font-medium">{a.target}</span>
                </p>
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">{a.time}</span>
              </div>
              {i < recentActivity.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}