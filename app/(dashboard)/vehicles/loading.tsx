import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/skeleton-parts";

// Mirrors vehicles/page.tsx: heading + Add button, the filters bar, then the
// vehicles table — shown while listVehicles() plus up to 9 parallel lookup
// queries resolve (the slowest page in the app on a cold cache).
export default function VehiclesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withAction />
      <Skeleton className="h-10 w-full rounded-lg" />
      <TableSkeleton columns={10} rows={10} />
    </div>
  );
}
