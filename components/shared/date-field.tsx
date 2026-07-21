"use client";

// Styled wrapper around a native <input type="date"> — matches the shadcn
// Input recipe (design-system.md §6.2) without pulling in a calendar-library
// dependency. Emits "YYYY-MM-DD" strings (native date input format) or null.

import { Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateFieldProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** Native "YYYY-MM-DD" floor — most browsers grey out earlier dates in the
   * picker, e.g. ETA can't be picked before ETD. Still just a UI nudge, not
   * validation on its own — the field can still be typed/pasted around it. */
  min?: string;
}

export function DateField({
  id,
  label,
  value,
  onChange,
  required,
  error,
  hint,
  disabled,
  min,
}: DateFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Calendar className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="date"
          value={value ?? ""}
          min={min}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
          className={cn("pl-8", error && "border-destructive")}
          aria-invalid={!!error}
        />
      </div>
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
