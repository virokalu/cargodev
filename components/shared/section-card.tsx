"use client";

// Collapsible boxed section — used to group related fields under a titled
// card with a minimize/expand chevron (the vehicle entry form's pattern,
// reused wherever a form or panel has enough fields to benefit from the same
// grouping). Each card minimizes independently; fields keep their values
// while collapsed, they're just not rendered.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  /** Defaults to the 2-column form layout; pass "space-y-3" (or similar) for
   * a single narrow column, e.g. a side panel. */
  contentClassName?: string;
  children: React.ReactNode;
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  contentClassName = "grid gap-4 sm:grid-cols-2",
  children,
}: SectionCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Icon className="size-5 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
            aria-label={open ? `Minimize ${title}` : `Expand ${title}`}
          >
            <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          </Button>
        </CardAction>
      </CardHeader>
      {open && <CardContent className={contentClassName}>{children}</CardContent>}
    </Card>
  );
}
