import {
  PageHeaderSkeleton,
  StatCardsSkeleton,
  ChartCardSkeleton,
} from "@/components/skeletons/skeleton-parts";

// Mirrors dashboard/page.tsx's shape: heading, 4 KPI cards, 3 pie charts +
// 1 wide bar chart, category breakdown card, trends card — shown while
// getDashboardStats/getDashboardTrends (several Prisma calls each) resolve.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      <ChartCardSkeleton title="h-5 w-56" height="h-[280px]" />
      <ChartCardSkeleton title="h-5 w-44" height="h-[280px]" />
      <ChartCardSkeleton title="h-5 w-32" height="h-[280px]" />
    </div>
  );
}
