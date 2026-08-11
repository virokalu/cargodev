import { Skeleton } from "@/components/ui/skeleton";

// Approximates ReportsView's shape (report-type tabs, a sticky toolbar of
// search/filters/track-toggle/export, summary tiles, then a list of grouped
// cards) — shown while the 7 parallel report queries in reports/page.tsx
// resolve. Not pixel-exact per-tab (each of the 4 report panels has its own
// layout), just close enough that the swap from skeleton to real content
// doesn't visibly jump. Previously had no loading.tsx at all, so this page
// flashed blank while its data loaded.
export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 min-w-48 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
