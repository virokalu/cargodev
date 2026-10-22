"use client";

// Replaces the old one-click "Download PDF" button (export-vehicle-pdf-
// button.tsx, now superseded) with a modal letting staff tick exactly which
// fields go into the generated PDF — including fields the PDF never used
// to render at all (Supplier, Partnership, Inspection, Sale Details — see
// lib/vehicle-pdf-fields.ts's header comment). The vehicle detail page
// (vehicle-detail-view.tsx) is a Server Component, so this interactive bit
// is its own small client leaf, same pattern as BackToVehiclesButton/
// DeleteVehicleDialog elsewhere in this directory.
//
// Field-level granularity: every individual field gets its own checkbox,
// grouped under a collapsible section header with a "select all in
// section" checkbox of its own (base-ui's CheckboxGroup `parent` checkbox,
// auto-indeterminate when only some of the section's fields are ticked —
// no hand-rolled indeterminate logic needed). Sections start expanded so
// everything's visible (and selected) by default; collapsing one is just a
// way to reduce clutter, it doesn't affect selection.
//
// Field/section definitions come from lib/vehicle-pdf-fields.ts, the same
// registry lib/vehicle-pdf.ts reads from when it actually builds the PDF —
// one list, so a field id can never drift out of sync between "what this
// checkbox says it is" and "what the PDF checks for".

import { useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxGroup } from "@/components/ui/checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchVehiclePdfImagesAction } from "@/app/(dashboard)/vehicles/actions";
import { exportVehicleDetailToPdf } from "@/lib/vehicle-pdf";
import { getPdfFieldSections, allPdfFieldIds, type PdfFieldId } from "@/lib/vehicle-pdf-fields";
import type { VehicleDetailData } from "@/lib/services/vehicle.service";

interface PdfFieldSelectionDialogProps {
  vehicle: VehicleDetailData;
  ecReceivedAt: Date | null;
  inspectionCompletedAt: Date | null;
}

function allSelected(sections: ReturnType<typeof getPdfFieldSections>): Record<string, string[]> {
  return Object.fromEntries(sections.map((section) => [section.id, section.fields.map((field) => field.id)]));
}

export function PdfFieldSelectionDialog({
  vehicle,
  ecReceivedAt,
  inspectionCompletedAt,
}: PdfFieldSelectionDialogProps) {
  const sections = useMemo(() => getPdfFieldSections(vehicle), [vehicle]);
  const allIds = useMemo(() => allPdfFieldIds(sections), [sections]);

  const [open, setOpen] = useState(false);
  // One entry per section — the field ids currently ticked within it.
  // Starts (and resets on close, same as convert-to-export-dialog.tsx
  // resets its own form state) with everything selected, matching the old
  // button's "always export everything" behaviour by default.
  const [selected, setSelected] = useState<Record<string, string[]>>(() => allSelected(sections));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const selectedCount = Object.values(selected).flat().length;

  async function handleGenerate() {
    setLoading(true);
    setError(false);
    try {
      const selectedFieldIds = new Set(Object.values(selected).flat()) as Set<PdfFieldId>;
      const images = await fetchVehiclePdfImagesAction(vehicle.id);
      exportVehicleDetailToPdf(vehicle, ecReceivedAt, inspectionCompletedAt, images, selectedFieldIds);
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSelected(allSelected(sections));
          setError(false);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <FileText className="size-4" />
        Download PDF
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose what to include</DialogTitle>
          <DialogDescription>
            Tick the fields to include in {vehicle.serial}&apos;s PDF. Everything is selected by default.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 border-b pb-3">
          <p className="text-xs text-muted-foreground">
            {selectedCount} of {allIds.length} fields selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(allSelected(sections))}>
              Select all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(Object.fromEntries(sections.map((s) => [s.id, []])))}
            >
              Clear all
            </Button>
          </div>
        </div>

        {/* overflow-y-auto forces overflow-x to clip too (same CSS-spec
         * quirk vehicle-filters-panel.tsx's Sheet already works around) —
         * harmless here since nothing in this list has a ring border that
         * would get cut off at the edge. */}
        <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
          {sections.map((section) => (
            <CheckboxGroup
              key={section.id}
              value={selected[section.id] ?? []}
              onValueChange={(next) => setSelected((prev) => ({ ...prev, [section.id]: next }))}
              allValues={section.fields.map((f) => f.id)}
              className="rounded-md border"
            >
              <Collapsible defaultOpen className="p-3">
                <div className="flex items-center gap-2">
                  <Checkbox id={`section-${section.id}`} parent />
                  <Label htmlFor={`section-${section.id}`} className="flex-1 font-semibold">
                    {section.title}
                  </Label>
                  <CollapsibleTrigger
                    className="w-auto shrink-0 rounded-md p-1 hover:bg-muted"
                    aria-label={`Toggle ${section.title} fields`}
                  />
                </div>
                <CollapsiblePanel>
                  <div className="mt-2 ml-6 grid grid-cols-1 gap-1.5 pt-1 sm:grid-cols-2">
                    {section.fields.map((f) => (
                      <div key={f.id} className="flex items-center gap-2">
                        <Checkbox id={`field-${f.id}`} value={f.id} />
                        <Label htmlFor={`field-${f.id}`} className="font-normal text-sm">
                          {f.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CollapsiblePanel>
              </Collapsible>
            </CheckboxGroup>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">Couldn&apos;t generate the PDF — try again.</p>}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={loading} />}>Cancel</DialogClose>
          <Button onClick={handleGenerate} disabled={loading || selectedCount === 0}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            {loading ? "Preparing PDF…" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
