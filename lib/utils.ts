import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "Jul 21, 2026" — the one date format used across read-only displays
 * (vehicle table, summaries) so dates look the same everywhere. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** The reverse of formatDate — "YYYY-MM-DD" for feeding a stored Date back
 * into a native <input type="date"> (e.g. prefilling the edit form). */
export function toDateInputValue(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}
