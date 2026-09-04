"use client";

// Compact 3-state dropdown (All / Yes / No) for filtering on a genuinely
// two-state flag (hasPartnership, convertedToExport) — same shape as
// TriStateFilterSelect, minus the "Not entered" option, since these fields
// are never null in the DB.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TwoStateFilterValue } from "@/lib/services/vehicle.service";

const OPTIONS: { value: TwoStateFilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

interface TwoStateFilterSelectProps {
  label: string;
  value: TwoStateFilterValue;
  onChange: (value: TwoStateFilterValue) => void;
}

export function TwoStateFilterSelect({ label, value, onChange }: TwoStateFilterSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TwoStateFilterValue)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={label}>
          {(itemValue: string) => {
            const option = OPTIONS.find((o) => o.value === itemValue);
            return itemValue === "ALL" ? label : `${label}: ${option?.label ?? "All"}`;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} label={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
