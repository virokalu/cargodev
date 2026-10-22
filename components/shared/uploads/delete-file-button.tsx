"use client";

// Confirms before actually deleting an uploaded document or photo —
// persist mode only (vehicle-document-list.tsx / vehicle-photo-gallery.tsx
// gate this in; stage mode's "remove from the list I haven't saved yet" on
// the Add Vehicle page stays a plain immediate click, since it's just a
// local array filter with nothing destructive to confirm). Same confirm-
// dialog shape as components/vehicles/delete-vehicle-dialog.tsx, the
// existing pattern for every other destructive confirmation in this app.

import { useRef, useState, useTransition } from "react";
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
import { triggerOnEnter } from "@/lib/utils";

interface DeleteFileButtonProps {
  /** e.g. `Delete "Freight Invoice.pdf"?` or `Delete this photo?` */
  title: string;
  description?: string;
  onConfirm: () => Promise<void>;
  triggerAriaLabel: string;
  /** Each caller's existing trigger styling differs (an inline document
   * row vs. an absolute-positioned, hover-revealed photo-grid overlay) —
   * passed through rather than hard-coded here. */
  triggerClassName: string;
  /** Trash2 icon size differs too (size-4 in the document list, size-3.5
   * in the tighter photo grid). */
  iconClassName?: string;
}

export function DeleteFileButton({
  title,
  description = "This can't be undone.",
  onConfirm,
  triggerAriaLabel,
  triggerClassName,
  iconClassName = "size-4",
}: DeleteFileButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Enter-to-confirm (triggerOnEnter below) fires whenever focus isn't on a
  // button, so an accidental Enter right after opening would otherwise
  // delete the file before the user reads the dialog. Defaulting focus to
  // Cancel makes that first Enter safe — Delete only fires once the user
  // has deliberately moved focus onto it. Same reasoning as
  // delete-vehicle-dialog.tsx.
  const cancelRef = useRef<HTMLButtonElement>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch {
        setError("Couldn't delete — try again.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={<button type="button" aria-label={triggerAriaLabel} className={triggerClassName} />}
      >
        <Trash2 className={iconClassName} />
      </DialogTrigger>
      <DialogContent
        initialFocus={cancelRef}
        onKeyDown={(event) => {
          if (!isPending) triggerOnEnter(event, handleConfirm);
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button ref={cancelRef} variant="outline" disabled={isPending} />}>
            Cancel
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
