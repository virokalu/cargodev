import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSectionSkeleton } from "@/components/skeletons/skeleton-parts";

// Shared by vehicles/add and vehicles/[id]/edit loading.tsx — both render
// VehicleForm, which groups the 35 tracked fields (Tech Doc §3) into 5
// SectionCards (auction, shipping, transport, documentation, status/extra)
// plus a read-only Summary card.
export function VehicleFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-56" />
      <FormSectionSkeleton fields={6} />
      <FormSectionSkeleton fields={6} />
      <FormSectionSkeleton fields={5} />
      <FormSectionSkeleton fields={6} />
      <FormSectionSkeleton fields={4} />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
