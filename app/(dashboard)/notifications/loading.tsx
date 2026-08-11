import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/skeletons/skeleton-parts";

// Mirrors NotificationList's shape: heading, "Mark all read" button, then
// rows of icon + title/body + timestamp — shown while listNotifications()
// resolves. Previously had no loading.tsx at all (nor does any ancestor
// route), so this page just flashed blank while its data loaded.
export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex justify-end">
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-md border px-3 py-2.5">
            <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-full max-w-sm" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
