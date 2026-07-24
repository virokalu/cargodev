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

const toneIconStyles: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
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