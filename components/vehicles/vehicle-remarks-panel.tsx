"use client";

// Vehicle Remarks — append-only thread (CLAUDE.md: "never editable or
// deletable; each entry stores author + timestamp"). Lives only on the edit
// page — a remark needs an existing vehicle to attach to, so there's nothing
// to show here in create mode. Oldest first, message-box style: history on
// top, the add-remark box at the bottom, same reading order as a chat.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import { addRemarkAction } from "@/app/(dashboard)/vehicles/actions";
import type { RemarkListItem } from "@/lib/services/remark.service";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface VehicleRemarksPanelProps {
  vehicleId: string;
  remarks: RemarkListItem[];
  /** Same access as the full edit form this panel lives on. */
  canAdd: boolean;
}

export function VehicleRemarksPanel({ vehicleId, remarks, canAdd }: VehicleRemarksPanelProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await addRemarkAction(vehicleId, body);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.fieldErrors?.body ?? result.message);
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <SectionCard icon={MessageSquare} title="Vehicle Remarks" contentClassName="space-y-4">
      <div className="space-y-3">
        {remarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No remarks yet.</p>
        ) : (
          remarks.map((remark) => (
            <div key={remark.id} className="flex gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                  {getInitials(remark.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-sm font-semibold text-foreground">{remark.authorName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(remark.createdAt)}</p>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{remark.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {canAdd && (
        <div className="space-y-2 border-t border-border pt-4">
          <Textarea
            placeholder="Add a remark…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={submitting || !body.trim()}
              onClick={handleSubmit}
            >
              {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Add Remark
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
