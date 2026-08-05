"use client";

// Documents — multiple PDFs per vehicle with a filename, uploader, and date
// (US-26). Edit-mode only, same reasoning as VehiclePhotoGallery: a
// document's vehicleId FK can't point at a vehicle that doesn't exist yet.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useFileUpload } from "@/components/shared/uploads/use-file-upload";
import { addVehicleDocumentAction, deleteVehicleDocumentAction } from "@/app/(dashboard)/vehicles/actions";
import type { VehicleDocumentListItem } from "@/lib/services/file.service";

interface DocumentUploadRowProps {
  vehicleId: string;
  file: File;
  onSettled: () => void;
}

function DocumentUploadRow({ vehicleId, file, onSettled }: DocumentUploadRowProps) {
  const router = useRouter();
  const { progress, error, upload } = useFileUpload();

  useEffect(() => {
    let cancelled = false;
    upload(file, { kind: "VEHICLE_DOCUMENT", vehicleId })
      .then(async (url) => {
        if (cancelled) return;
        await addVehicleDocumentAction(vehicleId, url, file.name);
        router.refresh();
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) onSettled();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally once per row — file/vehicleId are fixed for its lifetime

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

interface VehicleDocumentListProps {
  vehicleId: string;
  documents: VehicleDocumentListItem[];
  canEdit: boolean;
}

export function VehicleDocumentList({ vehicleId, documents, canEdit }: VehicleDocumentListProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inFlight, setInFlight] = useState<File[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setInFlight((prev) => [...prev, ...files]);
  }

  function handleRowSettled(file: File) {
    setInFlight((prev) => prev.filter((f) => f !== file));
  }

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    await deleteVehicleDocumentAction(vehicleId, documentId);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          Add Documents
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf"
        className="hidden"
        onChange={handleFilesSelected}
      />

      {inFlight.length > 0 && (
        <div className="space-y-1.5">
          {inFlight.map((file, i) => (
            <DocumentUploadRow
              key={`${file.name}-${i}`}
              vehicleId={vehicleId}
              file={file}
              onSettled={() => handleRowSettled(file)}
            />
          ))}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" />
          No documents yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-medium hover:underline"
              >
                {doc.name}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">
                {doc.uploaderName} · {formatDate(doc.createdAt)}
              </span>
              {canEdit && (
                <button
                  type="button"
                  aria-label="Delete document"
                  disabled={deletingId === doc.id}
                  onClick={() => handleDelete(doc.id)}
                  className="shrink-0 text-destructive"
                >
                  {deletingId === doc.id ? (
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
  );
}
