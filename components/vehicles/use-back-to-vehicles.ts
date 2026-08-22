"use client";

import { useRouter } from "next/navigation";
import type { MouseEventHandler } from "react";

/** Props for a "back to vehicles" control that restores whatever
 * filters/sort/page were active by using real browser history (which
 * already does this correctly — every filter change and row-click
 * navigation uses router.push, never replace, so the filtered URL is a
 * real history entry) instead of a hardcoded /vehicles href that always
 * lands on the unfiltered list. Falls back to a plain push to /vehicles
 * when there's no in-app history to go back to (e.g. this page was opened
 * directly via a bookmark/external link). */
export function useBackToVehicles() {
  const router = useRouter();
  /** Same history.back()-preferring logic as onClick below, callable directly
   * (e.g. after a successful save) where there's no click event to hook. */
  const navigate = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/vehicles");
    }
  };
  const onClick: MouseEventHandler = (event) => {
    if (window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
    // else: no in-app history — let the plain href="/vehicles" navigate normally
  };
  return { href: "/vehicles", onClick, navigate } as const;
}
