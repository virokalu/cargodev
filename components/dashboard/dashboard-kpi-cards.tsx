"use client";

// Icon component references can't cross the Server -> Client boundary as
// props (only plain serializable data can) — StatCard itself is a Client
// Component, so the icons have to be picked here, not passed in from the
// server page. This wrapper takes only plain numbers from the server.

import { Car, Clock, Ship } from "lucide-react";
import { StatCard } from "@/components/ui/statcard";

interface DashboardKpiCardsProps {
  totalVehicles: number;
  pendingFc: number;
  shippedFc: number;
}

export function DashboardKpiCards({ totalVehicles, pendingFc, shippedFc }: DashboardKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Total Vehicles" value={totalVehicles} icon={Car} tone="primary" />
      <StatCard label="Pending Shipping" value={pendingFc} icon={Clock} tone="warning" />
      <StatCard label="Shipped" value={shippedFc} icon={Ship} tone="success" />
    </div>
  );
}
