"use client";

// Inline-editable Auction Bill Paid, right in the vehicle table. A dropdown
// reads better than the 3-segment toggle once it's squeezed into a table
// cell — still the same tri-state values underneath (blank/Yes/No, never
// coercing "not entered" to "No" — CLAUDE.md tri-state rule), just wired to
// save immediately instead of being part of a full-form submit.

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
import { updateAuctionBillPaidAction } from "@/app/(dashboard)/vehicles/actions";

type TriStateKey = "BLANK" | "YES" | "NO";

const KEY_TO_VALUE: Record<TriStateKey, boolean | null> = {
  BLANK: null,
  YES: true,
  NO: false,
};

const KEY_TO_LABEL: Record<TriStateKey, string> = {
  BLANK: "—",
  YES: "Yes",
  NO: "No",
};

function valueToKey(value: boolean | null): TriStateKey {
  if (value === true) return "YES";
  if (value === false) return "NO";
  return "BLANK";
}

interface AuctionBillPaidCellProps {
  vehicleId: string;
  value: boolean | null;
}

export function AuctionBillPaidCell({ vehicleId, value }: AuctionBillPaidCellProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<TriStateKey>(valueToKey(value));
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    const key = (next as TriStateKey) ?? "BLANK";
    setCurrent(key);
    startTransition(async () => {
      await updateAuctionBillPaidAction(vehicleId, KEY_TO_VALUE[key]);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger className="h-7 w-24 text-xs" disabled={isPending}>
          {/* Select.Value doesn't read a SelectItem's rendered children —
           * without this it would print "BLANK"/"YES"/"NO" literally. */}
          <SelectValue placeholder="—">
            {(itemValue: TriStateKey) => KEY_TO_LABEL[itemValue] ?? "—"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BLANK" label="—">
            —
          </SelectItem>
          <SelectItem value="YES" label="Yes">
            Yes
          </SelectItem>
          <SelectItem value="NO" label="No">
            No
          </SelectItem>
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
    </div>
  );
}
