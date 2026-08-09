"use client";

// Documents — multiple PDFs per vehicle with a filename, uploader, and date
// (US-26). Each instance manages exactly one VehicleDocumentType — the
// parent (vehicle-form.tsx / vehicle-detail-view.tsx) renders one instance
// per type (LC, EC, ED, BL, Inspection Report, plus the pre-existing
// generic "Other" bucket) and is responsible for pre-filtering the
// `documents` it hands to each instance, so this component never needs to
// know about the other five types.
//
// Two modes, same reasoning as AuctionSheetUpload (see
// auction-sheet-upload.tsx):
//  - "stage": Add Vehicle form — no vehicleId exists yet, each uploaded
//    {url, name, documentType} triple is handed back via onChange and
//    submitted with the rest of the create payload.
//  - "persist": Edit page's Files panel — writes straight to the DB via
//    addVehicleDocumentAction the moment each upload finishes.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import type { VehicleDocumentType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileDropZone } from "@/components/shared/uploads/file-drop-zone";
import { useFileUpload } from "@/components/shared/uploads/use-file-upload";
import { addVehicleDocumentAction, deleteVehicleDocumentAction } from "@/app/(dashboard)/vehicles/actions";
import type { VehicleDocumentListItem } from "@/lib/services/file.service";

const ACCEPT = "application/pdf";

export interface StagedDocument {
  url: string;
  name: string;
  documentType: VehicleDocumentType;
}

interface DocumentUploadRowProps {
  vehicleId?: string;
  documentType: VehicleDocumentType;
  file: File;
  onSettled: () => void;
  /** Stage mode only — called with the R2 URL + original filename once the upload finishes. */
  onStaged?: (document: StagedDocument) => void;
}

function DocumentUploadRow({ vehicleId, documentType, file, onSettled, onStaged }: DocumentUploadRowProps) {
  const router = useRouter();
  const { progress, error, upload } = useFileUpload();

  useEffect(() => {
    let cancelled = false;
    upload(file, { kind: "VEHICLE_DOCUMENT", vehicleId })
      .then(async (url) => {
        if (cancelled) return;
        if (vehicleId) {
          await addVehicleDocumentAction(vehicleId, url, file.name, documentType);
          router.refresh();
        } else {
          onStaged?.({ url, name: file.name, documentType });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) onSettled();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally once per row — file/vehicleId/documentType are fixed for its lifetime

  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{file.name}</span>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : (
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

type VehicleDocumentListProps = {
  documentType: VehicleDocumentType;
  /** Used in the "Add {label}" button and "No {label} yet." empty state, so
   * six near-identical-looking sections stay distinguishable at a glance. */
  label: string;
} & (
  | { mode: "persist"; vehicleId: string; documents: VehicleDocumentListItem[]; canEdit: boolean }
  | { mode: "stage"; documents: StagedDocument[]; onChange: (documents: StagedDocument[]) => void }
);

export function VehicleDocumentList(props: VehicleDocumentListProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inFlight, setInFlight] = useState<File[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleNewFiles(files: File[]) {
    if (files.length === 0) return;
    setInFlight((prev) => [...prev, ...files]);
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    handleNewFiles(files);
  }

  function handleRowSettled(file: File) {
    setInFlight((prev) => prev.filter((f) => f !== file));
  }

  async function handleDelete(vehicleId: string, documentId: string) {
    setDeletingId(documentId);
    await deleteVehicleDocumentAction(vehicleId, documentId);
    setDeletingId(null);
    router.refresh();
  }

  const canEdit = props.mode === "persist" ? props.canEdit : true;

  // Normalized so the list below has one render path regardless of mode —
  // "stage" documents have no id/uploader/date until they're actually
  // persisted on save.
  const items: { key: string; url: string; name: string; meta: string | null; onDelete: (() => void) | null }[] =
    props.mode === "persist"
      ? props.documents.map((doc) => ({
          key: doc.id,
          url: doc.url,
          name: doc.name,
          meta: `${doc.uploaderName} · ${formatDate(doc.createdAt)}`,
          onDelete: canEdit ? () => handleDelete(props.vehicleId, doc.id) : null,
        }))
      : props.documents.map((doc) => ({
          key: doc.url,
          url: doc.url,
          name: doc.name,
          meta: null,
          // No R2 cleanup here — same accepted "harmless orphan" tradeoff as
          // AuctionSheetUpload's stage mode when a staged file is replaced
          // before submit.
          onDelete: () => props.onChange(props.documents.filter((d) => d.url !== doc.url)),
        }));

  return (
    <FileDropZone accept={ACCEPT} onFilesDropped={handleNewFiles} disabled={!canEdit}>
      <div className="space-y-3">
        {canEdit && (
          <div className="space-y-1">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              Add {props.label}
            </Button>
            <p className="text-xs text-muted-foreground">or drag and drop PDFs here</p>
          </div>
        )}
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={handleFilesSelected} />

        {inFlight.length > 0 && (
          <div className="space-y-1.5">
            {inFlight.map((file, i) => (
              <DocumentUploadRow
                key={`${file.name}-${i}`}
                vehicleId={props.mode === "persist" ? props.vehicleId : undefined}
                documentType={props.documentType}
                file={file}
                onSettled={() => handleRowSettled(file)}
                onStaged={
                  props.mode === "stage"
                    ? (document) => props.onChange([...props.documents, document])
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            No documents uploaded yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate font-medium hover:underline"
                >
                  {item.name}
                </a>
                {item.meta && <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>}
                {item.onDelete && (
                  <button
                    type="button"
                    aria-label="Delete document"
                    disabled={deletingId === item.key}
                    onClick={item.onDelete}
                    className="shrink-0 text-destructive"
                  >
                    {deletingId === item.key ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </FileDropZone>
  );
}
