// Dashboard — Tech Doc §7/§7.1, US-31 through US-35 and US-43. Server
// Component: fetches real stats via dashboard.service.ts and renders. Only
// the Recharts widgets (DashboardCharts, DashboardTrendsCard) need a client
// boundary — KPI cards and the unpaid-bills list are plain server-rendered JSX.

import Link from "next/link";
import { CheckCircle2, Receipt } from "lucide-react";
import { requireUser } from "@/lib/services/auth-guard";
import { getDashboardStats, getDashboardTrends } from "@/lib/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardCategoryBreakdown } from "@/components/dashboard/dashboard-category-breakdown";
import { DashboardTrendsCard } from "@/components/dashboard/dashboard-trends";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, trends] = await Promise.all([
    getDashboardStats(user.orgId),
    getDashboardTrends(user.orgId),
  ]);
  const unpaidCount = stats.unpaidAuctionBills.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your vehicle shipping operations.</p>
      </div>

      <DashboardKpiCards
        totalVehicles={stats.totalVehicles}
        pendingFc={stats.pendingFc}
        shippedFc={stats.shippedFc}
      />

      {/* Auction bills needing payment is the one dashboard widget that
       * flags something staff can still act on before it becomes a problem
       * at the auction house — kept right under the headline KPIs and
       * always visually called out (never a neutral/plain card), rather
       * than mixed in with the rest of the charts further down: red while
       * bills are outstanding so it can't be missed, green once everything
       * is confirmed paid so the "all clear" state is just as visible. */}
      <Card className={unpaidCount > 0 ? "border-destructive/50 bg-destructive/5" : "border-success/50 bg-success/5"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                unpaidCount > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
              )}
            >
              {unpaidCount > 0 ? <Receipt className="size-4" /> : <CheckCircle2 className="size-4" />}
            </span>
            Auction Bills Needing Payment
            <Badge variant={unpaidCount > 0 ? "destructive" : "success"} className="ml-auto">
              {unpaidCount > 0 ? `${unpaidCount} unpaid` : "All paid"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every vehicle&apos;s auction bill is confirmed paid.
            </p>
          ) : (
            <div className="divide-y">
              {stats.unpaidAuctionBills.map((vehicle) => (
                <Link
                  key={vehicle.id}
                  href={`/vehicles/${vehicle.id}/edit`}
                  className="flex items-center justify-between py-2.5 text-sm hover:bg-muted/50"
                >
                  <span className="font-mono font-medium">{vehicle.serial}</span>
                  <span className="text-muted-foreground">{vehicle.customerName ?? "No customer assigned"}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DashboardCharts stats={stats} />

      <DashboardCategoryBreakdown
        vehicleLocationDistribution={stats.vehicleLocationDistribution}
        transportByDistribution={stats.transportByDistribution}
        freightAgentDistribution={stats.freightAgentDistribution}
        exportVolumeByDestination={stats.exportVolumeByDestination.map((d) => ({
          name: d.destination,
          count: d.count,
        }))}
        brandDistribution={stats.brandDistribution}
      />

      <DashboardTrendsCard trends={trends} />
    </div>
  );
}
