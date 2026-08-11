"use client";

// One "All X" dropdown, shared by every filter on every Reports panel
// (customer, status, destination, auction hall) — they're all the same
// value/label-option shape, just different data.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ReportSelectOption {
  value: string;
  label: string;
}

interface ReportSelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: ReportSelectOption[];
  className?: string;
}

export function ReportSelectFilter({ value, onChange, allLabel, options, className }: ReportSelectFilterProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "ALL")}>
      <SelectTrigger className={className ?? "w-full sm:w-[170px]"}>
        <SelectValue placeholder={allLabel}>
          {(itemValue: string) =>
            itemValue === "ALL" ? allLabel : (options.find((o) => o.value === itemValue)?.label ?? allLabel)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL" label={allLabel}>
          {allLabel}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} label={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
