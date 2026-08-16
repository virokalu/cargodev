"use client";

// The vehicle detail page (vehicle-detail-view.tsx) is a Server Component,
// so this one interactive bit — fetching the R2 image bytes server-side
// then building/downloading the PDF client-side — is isolated into its own
// small client leaf, same pattern as BackToVehiclesButton/DeleteVehicleDialog
// elsewhere in this directory.

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchVehiclePdfImagesAction } from "@/app/(dashboard)/vehicles/actions";
import { exportVehicleDetailToPdf } from "@/lib/vehicle-pdf";
import type { VehicleDetailData } from "@/lib/services/vehicle.service";

interface ExportVehiclePdfButtonProps {
  vehicle: VehicleDetailData;
  ecReceivedAt: Date | null;
}

export function ExportVehiclePdfButton({ vehicle, ecReceivedAt }: ExportVehiclePdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const images = await fetchVehiclePdfImagesAction(vehicle.id);
      exportVehicleDetailToPdf(vehicle, ecReceivedAt, images);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={handleClick} disabled={loading}>
        {loading ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <FileText className="mr-1.5 size-4" />}
        {loading ? "Preparing PDF…" : "Download PDF"}
      </Button>
      {error && <p className="text-xs text-destructive">Couldn&apos;t generate the PDF — try again.</p>}
    </div>
  );
}
