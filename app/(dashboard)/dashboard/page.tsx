// Dashboard — Tech Doc §7/§7.1, US-31 through US-35, US-43, US-45. Server
// Component: fetches real stats via dashboard.service.ts and renders. Only
// the Recharts widgets and the KPI row (which owns 2 popups) need a client
// boundary — everything else is plain server-rendered JSX.

import { requireUser } from "@/lib/services/auth-guard";
import { getDashboardStats, getDashboardTrends } from "@/lib/services/dashboard.service";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your vehicle shipping operations.</p>
      </div>

      {/* Total Vehicles / Shipped jump straight to the vehicles table;
       * Pending Shipping / Unpaid Auction Bills each open a popup listing
       * exactly which vehicles they are before sending you to one. */}
      <DashboardKpiCards
        totalVehicles={stats.totalVehicles}
        pendingFc={stats.pendingFc}
        shippedFc={stats.shippedFc}
        pendingVehicles={stats.pendingVehicles}
        unpaidAuctionBills={stats.unpaidAuctionBills}
      />

      <DashboardCharts stats={stats} />

      <DashboardCategoryBreakdown
        vehicleLocationDistribution={stats.vehicleLocationDistribution}
        transportByDistribution={stats.transportByDistribution}
        freightAgentDistribution={stats.freightAgentDistribution}
        exportVolumeByDestination={stats.exportVolumeByDestination.map((d) => ({
          id: d.destination,
          name: d.destination,
          count: d.count,
        }))}
        brandDistribution={stats.brandDistribution}
      />

      <DashboardTrendsCard trends={trends} />
    </div>
  );
}
