"use client";

// Inline-editable Row Colour Status, right in the vehicle table (no need to
// open the edit page just to change which colour a row is). Saves through
// the same lookup.service-backed Server Action the edit form would use, then
// refreshes the table so the row's background picks up the new colour.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRowColourStatusAction } from "@/app/(dashboard)/vehicles/actions";
import { cn } from "@/lib/utils";

const NONE = "__NONE__";

interface RowColourStatusCellProps {
  vehicleId: string;
  value: string | null;
  options: { id: string; name: string; colour: string }[];
}

export function RowColourStatusCell({ vehicleId, value, options }: RowColourStatusCellProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? NONE);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    const id = !next || next === NONE ? null : next;
    setCurrent(id ?? NONE);
    startTransition(async () => {
      await updateRowColourStatusAction(vehicleId, id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger className="h-7 w-40 text-xs" disabled={isPending}>
          {/* Select.Value doesn't read a SelectItem's rendered children for
           * the trigger label — it needs this render function to look the
           * name up itself, or it falls back to printing the raw value
           * (the row-colour-status id). */}
          <SelectValue placeholder="—">
            {(itemValue: string) => {
              const option = options.find((o) => o.id === itemValue);
              return option ? option.name : "—";
            }}
          </SelectValue>
        </SelectTrigger>
        {/* Wider than the trigger — the trigger stays compact for the table
         * cell, but status names like "Shaken Fax from Auc OK" need more
         * room than that to not crowd the row. */}
        <SelectContent className="min-w-56">
          <SelectItem
            value={NONE}
            label="—"
            hideIndicator
            className={cn(current === NONE && "bg-muted")}
          >
            —
          </SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              label={option.name}
              hideIndicator
              // Selection shows as a tint of the status's own colour instead
              // of a checkmark — reads better than a tick crowding the text,
              // and ties the highlight to the colour being picked.
              style={
                current === option.id
                  ? { backgroundColor: `color-mix(in oklch, ${option.colour} 20%, transparent)` }
                  : undefined
              }
            >
              <span
                className="mr-1.5 inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: option.colour }}
              />
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
    </div>
  );
}
