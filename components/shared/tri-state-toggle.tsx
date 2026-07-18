"use client";

// Tri-state toggle — design-system.md §6.2/§6.6: a 3-segment control
// (—/Yes/No), active segment a white pill. Emits true | false | null and
// NEVER coerces a blank selection to false — null means "not entered yet",
// which is a different, honest value from "No" (CLAUDE.md tri-state rule).

import { cn } from "@/lib/utils";

interface TriStateToggleProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  disabled?: boolean;
}

const SEGMENTS: { value: boolean | null; label: string }[] = [
  { value: null, label: "—" },
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

export function TriStateToggle({ label, value, onChange, disabled }: TriStateToggleProps) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <div className="inline-flex gap-1 rounded-md bg-muted p-1">
        {SEGMENTS.map((segment) => {
          const isActive = segment.value === value;
          return (
            <button
              key={String(segment.value)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(segment.value)}
              className={cn(
                "min-w-14 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={isActive}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
