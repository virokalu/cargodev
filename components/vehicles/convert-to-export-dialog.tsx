"use client";

// Convert to Export confirmation (lib/vehicle-track.ts): once convertedToExport
// is set, this FL vehicle behaves as FC everywhere (shipment status tracking,
// shipping fields), even though its FL-prefixed serial never changes.
// Reversible from the edit page (see revert-to-local-dialog.tsx) for an
// accidental conversion. Same real-modal pattern as delete-vehicle-dialog.tsx,
// but styled as a normal confirmation rather than destructive.

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
import { CountrySelect } from "@/components/shared/country-select";
import type { CountryOption } from "@/lib/constants/countries";
import { convertVehicleToExportAction } from "@/app/(dashboard)/vehicles/actions";

interface ConvertToExportDialogProps {
  vehicleId: string;
  serial: string;
  countries: CountryOption[];
}

export function ConvertToExportDialog({ vehicleId, serial, countries }: ConvertToExportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      const result = await convertVehicleToExportAction(vehicleId, destination);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDestination("");
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <ArrowRightLeft className="size-4" />
        Convert to Export
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert {serial} to Export?</DialogTitle>
          <DialogDescription>Are you sure you want to convert {serial} to Export?</DialogDescription>
        </DialogHeader>
        <CountrySelect
          id="convertDestination"
          label="Destination"
          options={countries}
          value={destination}
          onChange={setDestination}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button onClick={handleConvert} disabled={isPending || !destination.trim()}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
            Convert to Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
