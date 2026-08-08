"use client";

// Shared drag-and-drop wrapper for every upload widget (Auction Sheet,
// Vehicle Photos, Documents) — adds "drop files anywhere in this section"
// as an alternative to the existing "click to browse" button, without
// touching any of their own upload/progress/list logic. Each consumer just
// wires onFilesDropped to whatever it already does with a FileList from its
// <input onChange>.

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  /** Same comma-separated MIME list as the paired <input accept="...">, so
   * a drop only ever accepts what the file picker would have shown anyway. */
  accept: string;
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

function matchesAccept(file: File, accept: string): boolean {
  const patterns = accept
    .split(",")
    .map((pattern) => pattern.trim())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) =>
    pattern.endsWith("/*") ? file.type.startsWith(pattern.slice(0, -1)) : file.type === pattern
  );
}

export function FileDropZone({ accept, onFilesDropped, disabled, className, children }: FileDropZoneProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        if (disabled) return;
        // Required so the browser fires onDrop instead of opening the file
        // in a new tab (its default behaviour for a dropped file).
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={(event) => {
        // A child element re-firing dragenter/dragleave as the cursor moves
        // over it would otherwise flicker the highlight on and off — only
        // clear it once the pointer actually leaves this whole wrapper.
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setIsOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        if (disabled) return;
        const files = Array.from(event.dataTransfer.files).filter((file) => matchesAccept(file, accept));
        if (files.length > 0) onFilesDropped(files);
      }}
      className={cn(
        "-m-2 rounded-lg border-2 border-dashed border-transparent p-2 transition-colors",
        isOver && !disabled && "border-primary/50 bg-primary/5",
        className
      )}
    >
      {children}
    </div>
  );
}
