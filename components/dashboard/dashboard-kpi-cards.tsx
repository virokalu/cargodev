"use client";

// Icon component references can't cross the Server -> Client boundary as
// props (only plain serializable data can) — StatCard itself is a Client
// Component, so the icons have to be picked here, not passed in from the
// server page. This wrapper takes only plain numbers/objects from the server.
//
// All 4 KPI cards are clickable: Total Vehicles and Shipped jump straight to
// the vehicles table (Shipped scoped to FC + Shipped, matching exactly what
// the card counted). Pending Shipping and Unpaid Auction Bills each open the
// same style of popup instead of navigating away — a Manager glancing at the
// dashboard usually wants to see *which* vehicles those are, not just how
// many, before deciding whether it's worth leaving the dashboard at all.
// Picking one from either popup takes you straight to it in the vehicles
// table (via the existing serial search).

import { useState } from "react";
import Link from "next/link";
import { Car, CheckCircle2, Clock, Receipt, Ship } from "lucide-react";
import { StatCard } from "@/components/ui/statcard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { VehicleSummary } from "@/lib/services/dashboard.service";

interface DashboardKpiCardsProps {
  totalVehicles: number;
  pendingFc: number;
  shippedFc: number;
  pendingVehicles: VehicleSummary[];
  unpaidAuctionBills: VehicleSummary[];
}

// Shared hover treatment so every KPI card reads as clickable the same way,
// whether it's a real link or a button that opens a popup.
const CLICKABLE_CARD = "block w-full rounded-xl text-left transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer";

/** Shared by both popups (Pending Shipping, Unpaid Auction Bills) — same
 * layout, just a different title/description/list. Each entry is its own
 * small bordered box (serial + year, brand/model, customer) that links
 * straight to that vehicle in the vehicles table. */
function VehicleSummaryDialog({
  open,
  onOpenChange,
  title,
  description,
  vehicles,
  emptyLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  vehicles: VehicleSummary[];
  emptyLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className={cn("space-y-2 overflow-y-auto", vehicles.length > 0 && "max-h-[60vh]")}>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            vehicles.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/vehicles?q=${encodeURIComponent(vehicle.serial)}`}
                onClick={() => onOpenChange(false)}
                className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium">{vehicle.serial}</span>
                  <span className="text-muted-foreground">{vehicle.yom ?? "—"}</span>
                </div>
                <div className="mt-0.5 truncate">
                  {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "—"}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {vehicle.customerName ?? "No customer assigned"}
                </div>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardKpiCards({
  totalVehicles,
  pendingFc,
  shippedFc,
  pendingVehicles,
  unpaidAuctionBills,
}: DashboardKpiCardsProps) {
  const [pendingOpen, setPendingOpen] = useState(false);
  const [unpaidOpen, setUnpaidOpen] = useState(false);
  const unpaidCount = unpaidAuctionBills.length;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/vehicles" className={CLICKABLE_CARD} aria-label="View all vehicles">
          <StatCard label="Total Vehicles" value={totalVehicles} icon={Car} tone="primary" />
        </Link>

        <button
          type="button"
          onClick={() => setPendingOpen(true)}
          className={CLICKABLE_CARD}
          aria-label="View pending vehicles"
        >
          <StatCard label="Pending Shipping" value={pendingFc} icon={Clock} tone="warning" />
        </button>

        <Link
          href="/vehicles?status=SHIPPED&track=FC"
          className={CLICKABLE_CARD}
          aria-label="View shipped vehicles"
        >
          <StatCard label="Shipped" value={shippedFc} icon={Ship} tone="success" />
        </Link>

        <button
          type="button"
          onClick={() => setUnpaidOpen(true)}
          className={CLICKABLE_CARD}
          aria-label="View vehicles with unpaid auction bills"
        >
          <StatCard
            label="Unpaid Auction Bills"
            value={unpaidCount}
            icon={unpaidCount > 0 ? Receipt : CheckCircle2}
            tone={unpaidCount > 0 ? "destructive" : "success"}
          />
        </button>
      </div>

      <VehicleSummaryDialog
        open={pendingOpen}
        onOpenChange={setPendingOpen}
        title={`Pending Shipping (${pendingVehicles.length})`}
        description="FC vehicles still pending. Pick one to find it in the vehicles table."
        vehicles={pendingVehicles}
        emptyLabel="No FC vehicles are pending shipment."
      />

      <VehicleSummaryDialog
        open={unpaidOpen}
        onOpenChange={setUnpaidOpen}
        title={`Unpaid Auction Bills (${unpaidCount})`}
        description="Auction bill is blank or not confirmed paid. Pick one to find it in the vehicles table."
        vehicles={unpaidAuctionBills}
        emptyLabel="Every vehicle's auction bill is confirmed paid."
      />
    </>
  );
}
