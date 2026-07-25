import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/skeleton-parts";

// Mirrors UsersTable's own header (title + Add User + search) plus its
// 3-column table — shown while listStaff() resolves.
export default function UsersLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton withAction />
      <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
      <TableSkeleton columns={3} rows={8} />
    </div>
  );
}
