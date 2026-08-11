import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroupSkeleton, TimelineSkeleton } from "@/components/skeletons/skeleton-parts";

// Mirrors VehicleDetailView's shape: back button + icon + title/serial +
// status badge header, the Auction Sheet/Photos card, Information/
// Documents/Notes tabs, and the Shipment Timeline sidebar — shown while
// getVehicleDetail + listVehicleFiles resolve. Without this file, this
// route fell back to the parent vehicles/loading.tsx (a table skeleton),
// which doesn't resemble a detail page at all. Always renders the 3-column
// FC layout (incl. the timeline) since whether this vehicle is FC or FL
// isn't known until the real data loads — same width either way keeps the
// swap from shifting the page for the common (FC) case.
export default function VehicleDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="size-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="aspect-video w-full rounded-lg" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="aspect-video w-full rounded-lg" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-1.5">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <div className="space-y-6 rounded-lg border p-4">
              <FieldGroupSkeleton fields={10} />
              <FieldGroupSkeleton fields={6} />
              <FieldGroupSkeleton fields={6} />
              <FieldGroupSkeleton fields={9} />
            </div>
          </div>
        </div>

        <div className="self-start rounded-lg border p-4">
          <Skeleton className="mb-4 h-5 w-36" />
          <TimelineSkeleton steps={6} />
        </div>
      </div>
    </div>
  );
}
