"use client";

// KPI tile for the top of each Reports panel — icon-above-value-above-label
// layout matches the approved design, which differs from the shared
// components/ui/statcard.tsx (icon beside the value). Kept local to Reports
// rather than reshaping the shared StatCard for one screen's layout.

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ReportTileTone = "primary" | "info" | "destructive";

const TONE_CLASSNAME: Record<ReportTileTone, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/10 text-destructive",
};

interface ReportSummaryTileProps {
  icon: LucideIcon;
  tone: ReportTileTone;
  value: number;
  label: string;
  sublabel: string;
}

export function ReportSummaryTile({ icon: Icon, tone, value, label, sublabel }: ReportSummaryTileProps) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className={cn("mb-2 inline-flex size-8 items-center justify-center rounded-lg", TONE_CLASSNAME[tone])}>
          <Icon className="size-4" />
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </CardContent>
    </Card>
  );
}
