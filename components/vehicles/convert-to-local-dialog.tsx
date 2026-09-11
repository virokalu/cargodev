"use client";

// Mirror of convert-to-export-dialog.tsx — converts a native FC vehicle to
// behave as Local from this point on (lib/services/vehicle.service.ts's
// convertVehicleToLocal). Unlike that dialog, no destination field: that's
// an FC-only concept, not needed going this direction. Reversible via
// revert-to-export-dialog.tsx. Same real-modal pattern as every other
// vehicle dialog in this folder.

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
import { convertVehicleToLocalAction } from "@/app/(dashboard)/vehicles/actions";
import { triggerOnEnter } from "@/lib/utils";

interface ConvertToLocalDialogProps {
  vehicleId: string;
  serial: string;
}

export function ConvertToLocalDialog({ vehicleId, serial }: ConvertToLocalDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      const result = await convertVehicleToLocalAction(vehicleId);
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
        Convert to Local
      </DialogTrigger>
      <DialogContent onKeyDown={(event) => { if (!isPending) triggerOnEnter(event, handleConvert); }}>
        <DialogHeader>
          <DialogTitle>Convert {serial} to Local?</DialogTitle>
          <DialogDescription>Are you sure you want to convert {serial} to Local?</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button onClick={handleConvert} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeftRight className="size-4" />}
            Convert to Local
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
