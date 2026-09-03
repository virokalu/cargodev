"use client";

// Reverts an accidental "Convert to Export" (lib/services/vehicle.service.ts's
// revertVehicleToLocal): flips convertedToExport back off. Any FC-only data
// this vehicle picked up while converted (ETD/ETA/BL, shipment status,
// StatusHistory rows) stays in the DB untouched — it just stops being shown
// or tracked, since every FC/FL check reads the flag fresh. Same real-modal
// pattern as convert-to-export-dialog.tsx.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";
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
import { revertVehicleToLocalAction } from "@/app/(dashboard)/vehicles/actions";
import { triggerOnEnter } from "@/lib/utils";

interface RevertToLocalDialogProps {
  vehicleId: string;
  serial: string;
}

export function RevertToLocalDialog({ vehicleId, serial }: RevertToLocalDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevert() {
    setError(null);
    startTransition(async () => {
      const result = await revertVehicleToLocalAction(vehicleId);
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
        <ArrowLeftRight className="size-4" />
        Revert to Local
      </DialogTrigger>
      <DialogContent onKeyDown={(event) => { if (!isPending) triggerOnEnter(event, handleRevert); }}>
        <DialogHeader>
          <DialogTitle>Revert {serial} to Local?</DialogTitle>
          <DialogDescription>Are you sure you want to revert {serial} to Local?</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button onClick={handleRevert} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeftRight className="size-4" />}
            Revert to Local
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
