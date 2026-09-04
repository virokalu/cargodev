import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { KeyboardEvent } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Fires `onEnter` (the screen's "main" action — Save, Convert, Delete, ...)
 * when Enter is pressed, without wrapping the screen in a real <form>. A
 * real <form> would be simpler, but every Base UI Popover/Select/Combobox
 * trigger in this app renders a plain `<button>` with no `type` set (see
 * Base UI's Button/PopoverTrigger source), which defaults to
 * type="submit" — inside a <form> that means clicking any dropdown in the
 * vehicle form would also submit it. This is the deliberately safer
 * alternative: attach it to a keydown handler on the screen's root element.
 *
 * Skips when:
 * - a nested widget already handled Enter itself (event.defaultPrevented —
 *   e.g. a Select/Popover closing on Enter)
 * - the target is a <button> (let its own focus-activates-on-Enter native
 *   behaviour win — e.g. a focused Cancel button) or a <textarea> (Enter
 *   there means "newline")
 * - the target is a cmdk/Command search box (data-slot="command-input",
 *   see components/ui/command.tsx) — Enter there selects the highlighted
 *   combobox option, not "submit the whole screen"
 *
 * Pass `requireInput: true` for a screen with multiple fields (only a
 * literal <input> should trigger it, not e.g. a description paragraph);
 * omit it for a plain confirm dialog with no input field at all, where
 * Enter anywhere in the dialog should confirm.
 */
export function triggerOnEnter(
  event: KeyboardEvent,
  onEnter: () => void,
  options?: { requireInput?: boolean }
): void {
  if (event.key !== "Enter" || event.defaultPrevented) return;
  const target = event.target as HTMLElement;
  if (target.tagName === "BUTTON" || target.tagName === "TEXTAREA") return;
  if (target.closest('[data-slot="command-input"]')) return;
  if (options?.requireInput && target.tagName !== "INPUT") return;
  event.preventDefault();
  onEnter();
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

/** "Jul 21, 2026, 3:45 PM" — formatDate plus a time, for timestamps where
 * the time of day matters (e.g. an append-only remarks thread). */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
