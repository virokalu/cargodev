"use client";

// Segmented tab control shared by all three Reports panels — same visual
// recipe as the FC/FL toggle on the Vehicles screen
// (components/vehicles/vehicle-filters-bar.tsx). Rendered inside whichever
// panel is currently active (see reports-view.tsx) rather than owned by a
// single always-mounted parent, so it has to receive its state from outside
// instead of holding its own — clicking a tab from Panel A has to be able
// to switch the page to Panel B.

import { cn } from "@/lib/utils";

export type ReportTab = "customer" | "auctionHall" | "destination";

const TABS: { value: ReportTab; label: string }[] = [
  { value: "customer", label: "Customer Vehicle" },
  { value: "auctionHall", label: "Auction Hall" },
  { value: "destination", label: "Destination" },
];

interface ReportTabsProps {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

export function ReportTabs({ activeTab, onTabChange }: ReportTabsProps) {
  return (
    <div className="inline-flex gap-1 rounded-md bg-muted p-1">
      {TABS.map((tab) => {
        const active = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
              active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={active}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
