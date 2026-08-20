// components/StatCard.tsx
"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "primary" | "warning" | "info" | "success" | "destructive";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: number;
  tone?: Tone;
}

// Light mode keeps the generic bg-{tone}/10 tint. Dark mode gets its own
// exact, pre-approved fill per tone (richer/darker than a plain opacity
// tint of the retuned tokens would produce) — matches the KPI card spec:
// Total Vehicles/blue, Pending Shipping/amber, Booking Received/cyan,
// Shipped/emerald, Unpaid Bills/rose.
const toneIconStyles: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary dark:bg-[#1e293b] dark:text-[#60a5fa]",
  warning: "bg-warning/10 text-warning dark:bg-[#78350f] dark:text-[#fbbf24]",
  info: "bg-info/10 text-info dark:bg-[#0c4a6e] dark:text-[#38bdf8]",
  success: "bg-success/10 text-success dark:bg-[#065f46] dark:text-[#34d399]",
  destructive: "bg-destructive/10 text-destructive dark:bg-[#7f1d1d] dark:text-[#f87171]",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "primary",
}: StatCardProps) {
  const isPositive = (trend ?? 0) >= 0;

  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {trend !== undefined && (
            <Badge
              variant={isPositive ? "success" : "destructive"}
              className="gap-0.5 px-1.5"
            >
              {isPositive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
        <div className={cn("rounded-lg p-2", toneIconStyles[tone])}>
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}