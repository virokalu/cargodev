"use client";

// Read-only popup for a row's full Vehicle Remark, triggered from the
// Actions column next to View/Edit/Delete (vehicles-table.tsx) — the
// Vehicle Remark column itself only shows a truncated preview, so this is
// the way to read a long one in full.

import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function VehicleRemarkCell({ serial, remark }: { serial: string; remark: string | null }) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label="View full vehicle remark"
      >
        <MessageSquareText className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Vehicle Remark — {serial}</DialogTitle>
        {remark ? (
          // whitespace-pre-wrap preserves line breaks staff typed into the
          // remark — the table cell's own truncate collapses them.
          <p className="text-sm whitespace-pre-wrap">{remark}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Empty remark.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
