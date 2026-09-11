"use client";

// Reverts an accidental "Convert to Local" (lib/services/vehicle.service.ts's
// revertVehicleToExport): flips convertedToLocal back off. Nothing needs
// clearing — every FC/FL check reads the flag fresh, so this vehicle's
// original FC behavior (and its pre-conversion shipment history) is simply
// read again the instant the flag flips. Same real-modal pattern as
// revert-to-local-dialog.tsx.

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
import { revertVehicleToExportAction } from "@/app/(dashboard)/vehicles/actions";
import { triggerOnEnter } from "@/lib/utils";

interface RevertToExportDialogProps {
  vehicleId: string;
  serial: string;
}

export function RevertToExportDialog({ vehicleId, serial }: RevertToExportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevert() {
    setError(null);
    startTransition(async () => {
      const result = await revertVehicleToExportAction(vehicleId);
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
        Revert to Export
      </DialogTrigger>
      <DialogContent onKeyDown={(event) => { if (!isPending) triggerOnEnter(event, handleRevert); }}>
        <DialogHeader>
          <DialogTitle>Revert {serial} to Export?</DialogTitle>
          <DialogDescription>Are you sure you want to revert {serial} to Export?</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button onClick={handleRevert} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
            Revert to Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
