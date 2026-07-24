"use client";

// Compact 4-state dropdown (All / Yes / No / Not entered) for filtering on a
// tri-state flag — used for Auction Bill Paid, Log Book and Extra Key, which
// are all the exact same shape, hence pulling this out instead of writing the
// same 4-item Select three times.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TriStateFilterValue } from "@/lib/services/vehicle.service";

const OPTIONS: { value: TriStateFilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
  { value: "BLANK", label: "Not entered" },
];

interface TriStateFilterSelectProps {
  label: string;
  value: TriStateFilterValue;
  onChange: (value: TriStateFilterValue) => void;
}

export function TriStateFilterSelect({ label, value, onChange }: TriStateFilterSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TriStateFilterValue)}>
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
