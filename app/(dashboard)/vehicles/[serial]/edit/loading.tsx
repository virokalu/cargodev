import { VehicleFormSkeleton } from "@/components/skeletons/vehicle-form-skeleton";

// Shown while getVehicleForEdit and listRowColourStatuses resolve.
export default function EditVehicleLoading() {
  return <VehicleFormSkeleton />;
}
