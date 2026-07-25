import { VehicleFormSkeleton } from "@/components/skeletons/vehicle-form-skeleton";

// Shown while previewNextSerial (x2) and listRowColourStatuses resolve.
export default function AddVehicleLoading() {
  return <VehicleFormSkeleton />;
}
