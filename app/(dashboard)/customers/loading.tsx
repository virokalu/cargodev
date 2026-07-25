import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons/skeleton-parts";

// Mirrors CustomersTable's own header (title + Add Customer + search) plus
// its 5-column table — shown while listCustomers() resolves.
export default function CustomersLoading() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton withAction />
      <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
      <TableSkeleton columns={5} rows={8} />
    </div>
  );
}
