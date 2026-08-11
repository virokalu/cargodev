"use client";

// FC/FL segmented toggle, shared by all three Reports panels — same visual
// recipe (and same two options, same default) as the Vehicles table's own
// track toggle (components/vehicles/vehicle-filters-bar.tsx).

import type { ReportTrack } from "@/lib/services/reports.service";
import { cn } from "@/lib/utils";

const TRACKS: { value: ReportTrack; label: string }[] = [
  { value: "FC", label: "FC — Export" },
  { value: "FL", label: "FL — Local" },
];

interface ReportTrackToggleProps {
  track: ReportTrack;
  onTrackChange: (track: ReportTrack) => void;
}

export function ReportTrackToggle({ track, onTrackChange }: ReportTrackToggleProps) {
  return (
    <div className="inline-flex gap-1 rounded-md bg-muted p-1">
      {TRACKS.map((option) => {
        const active = option.value === track;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onTrackChange(option.value)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
              active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
