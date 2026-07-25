"use client";

// Inline-editable Auction Bill Paid, right in the vehicle table (no need to
// open the edit page just to flip this one tri-state field). A dropdown
// rather than the form's —/Yes/No TriStateToggle — the trigger itself reads
// as the same coloured pill the read-only TriStateCell badge uses elsewhere
// in this table (green Yes / near-white No), so the column looks the same
// whether or not you can edit it, just with a chevron and an open state
// when you can. Saved through the same Server Action pattern
// RowColourStatusCell uses, then refreshes the table.

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
import { cn } from "@/lib/utils";

const YES = "YES";
const NO = "NO";
const NONE = "__NONE__";

type OptionValue = typeof YES | typeof NO | typeof NONE;

function toOptionValue(value: boolean | null): OptionValue {
  return value === true ? YES : value === false ? NO : NONE;
}

function fromOptionValue(value: string): boolean | null {
  return value === YES ? true : value === NO ? false : null;
}

// Matches badgeVariants' "success" (Yes) and "secondary" (No) exactly — the
// same colours TriStateCell's read-only Badge uses for these two values.
const PILL_STYLE: Record<OptionValue, string> = {
  [YES]: "border-transparent bg-success text-success-foreground",
  [NO]: "border-transparent bg-secondary text-secondary-foreground",
  [NONE]: "border-dashed text-muted-foreground",
};
const LABEL: Record<OptionValue, string> = { [YES]: "Yes", [NO]: "No", [NONE]: "—" };
const OPTIONS: OptionValue[] = [NONE, YES, NO];

interface AuctionBillPaidCellProps {
  vehicleId: string;
  value: boolean | null;
}

export function AuctionBillPaidCell({ vehicleId, value }: AuctionBillPaidCellProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<OptionValue>(toOptionValue(value));
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    const option = (next as OptionValue) ?? NONE;
    setCurrent(option);
    startTransition(async () => {
      await updateAuctionBillPaidAction(vehicleId, fromOptionValue(option));
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger
          size="sm"
          disabled={isPending}
          className={cn(
            "h-7 w-[4.5rem] justify-center rounded-full px-2.5 text-xs font-semibold",
            PILL_STYLE[current]
          )}
        >
          <SelectValue placeholder="—">{() => LABEL[current]}</SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-24" align="start">
          {OPTIONS.map((option) => (
            <SelectItem key={option} value={option} hideIndicator>
              <span
                className={cn(
                  "inline-flex w-14 justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  PILL_STYLE[option],
                  current === option && "ring-2 ring-ring/40"
                )}
              >
                {LABEL[option]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
    </div>
  );
}
