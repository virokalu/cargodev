"use client";

// Convert to Export confirmation — one-way action (lib/vehicle-track.ts): once
// convertedToExport is set, this FL vehicle behaves as FC everywhere (shipment
// status tracking, shipping fields) forever, even though its FL-prefixed serial
// never changes. Same real-modal pattern as delete-vehicle-dialog.tsx, but
// styled as a normal confirmation rather than destructive.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { convertVehicleToExportAction } from "@/app/(dashboard)/vehicles/actions";

interface ConvertToExportDialogProps {
  vehicleId: string;
  serial: string;
}

export function ConvertToExportDialog({ vehicleId, serial }: ConvertToExportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      const result = await convertVehicleToExportAction(vehicleId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <ArrowRightLeft className="size-4" />
        Convert to Export
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert {serial} to Export?</DialogTitle>
          <DialogDescription>
            This switches {serial} from Local to Export tracking — shipping fields (ETD/ETA,
            BL, freight agent) and shipment status become active for this vehicle from now on.
            Its serial number stays the same. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button onClick={handleConvert} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
            Convert to Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
