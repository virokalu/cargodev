"use client";

// Corrects a typo in a serial's numeric part after creation — the one
// documented exception to "serial is read-only after creation"
// (lib/services/vehicle.service.ts's correctVehicleSerialNumber). The prefix
// (FC/FL, and therefore the track) is fixed and shown read-only; only the
// number is editable. Administrator-only (see actions.ts) since this
// rewrites SerialCounter state directly. Same real-modal pattern as
// convert-to-export-dialog.tsx.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { correctVehicleSerialNumberAction } from "@/app/(dashboard)/vehicles/actions";

interface EditSerialNumberDialogProps {
  vehicleId: string;
  serial: string;
}

// Serial is always PREFIX (2 letters) + digits, e.g. "FC1024" — see the
// SerialPrefix enum in prisma/schema.prisma.
function splitSerial(serial: string): { prefix: string; number: string } {
  const match = /^([A-Z]+)(\d+)$/.exec(serial);
  return match ? { prefix: match[1], number: match[2] } : { prefix: "", number: serial };
}

export function EditSerialNumberDialog({ vehicleId, serial }: EditSerialNumberDialogProps) {
  const router = useRouter();
  const { prefix, number } = splitSerial(serial);
  const [open, setOpen] = useState(false);
  const [numberInput, setNumberInput] = useState(number);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    const parsed = Number(numberInput);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("Enter a positive whole number.");
      return;
    }
    startTransition(async () => {
      const result = await correctVehicleSerialNumberAction(vehicleId, parsed);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      // The route is keyed by serial (/vehicles/[serial]/edit) — the old URL
      // is now a dead link since that serial no longer exists, so navigate
      // to the new one instead of router.refresh() (which would re-fetch at
      // the stale URL and 404).
      router.replace(`/vehicles/${result.serial}/edit`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setNumberInput(number);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Edit serial number" />}>
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct Serial Number</DialogTitle>
          <DialogDescription>Are you sure you want to change {serial}&apos;s number?</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <span className="rounded-md border bg-muted px-3 py-2 text-sm font-medium">{prefix}</span>
          <Input
            value={numberInput}
            onChange={(e) => setNumberInput(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={isPending || !numberInput.trim()}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
