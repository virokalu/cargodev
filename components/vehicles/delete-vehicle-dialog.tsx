"use client";

// Delete confirmation — a real modal (matches the rest of the design system)
// instead of a browser confirm(). Deletion is a soft delete (vehicle.service
// .ts deleteVehicle): the row disappears from every list immediately, but
// nothing is actually destroyed at the database level.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
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
import { deleteVehicleAction } from "@/app/(dashboard)/vehicles/actions";

interface DeleteVehicleDialogProps {
  vehicleId: string;
  serial: string;
}

export function DeleteVehicleDialog({ vehicleId, serial }: DeleteVehicleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteVehicleAction(vehicleId);
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
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
          />
        }
        aria-label={`Delete ${serial}`}
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {serial}?</DialogTitle>
          <DialogDescription>
            This removes {serial} from the vehicle list and every report. It won&apos;t show up
            anywhere in the app anymore.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
