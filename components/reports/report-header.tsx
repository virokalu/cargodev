"use client";

// Title + subtitle + PDF/Excel export buttons — identical across all three
// Reports panels except what the buttons export, so each panel renders its
// own copy wired to its own filtered data (see reports-view.tsx for why
// that's simpler here than lifting export state up to a shared parent).

import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportHeaderProps {
  onExportPdf: () => void;
  onExportCsv: () => void;
  exportDisabled: boolean;
}

export function ReportHeader({ onExportPdf, onExportCsv, exportDisabled }: ReportHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Analyse shipments by customer, auction hall and destination country.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={exportDisabled} onClick={onExportPdf}>
          <FileText className="mr-1.5 size-4" />
          PDF
        </Button>
        <Button variant="outline" disabled={exportDisabled} onClick={onExportCsv}>
          <FileSpreadsheet className="mr-1.5 size-4" />
          Excel
        </Button>
      </div>
    </div>
  );
}
