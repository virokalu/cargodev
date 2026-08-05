"use client";

// Vehicle Photos — multi-image upload with per-file progress + a gallery grid
// with per-photo delete (US-25). Two modes, same reasoning as
// AuctionSheetUpload (see auction-sheet-upload.tsx):
//  - "stage": Add Vehicle form — no vehicleId exists yet, each uploaded URL is
//    handed back via onChange and submitted with the rest of the create
//    payload.
//  - "persist": Edit page's Files panel — writes straight to the DB via
//    addVehiclePhotoAction the moment each upload finishes.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Images, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/components/shared/uploads/use-file-upload";
import { addVehiclePhotoAction, deleteVehiclePhotoAction } from "@/app/(dashboard)/vehicles/actions";
import type { VehiclePhotoListItem } from "@/lib/services/file.service";

interface PhotoUploadRowProps {
  vehicleId?: string;
  file: File;
  onSettled: () => void;
  /** Stage mode only — called with the R2 URL once the upload finishes. */
  onStaged?: (url: string) => void;
}

/** Owns its own upload hook so N simultaneous uploads get independent
 * progress bars without the parent having to track a list of them. */
function PhotoUploadRow({ vehicleId, file, onSettled, onStaged }: PhotoUploadRowProps) {
  const router = useRouter();
  const { progress, error, upload } = useFileUpload();

  // Runs once per mounted row — each selected file gets exactly one row, and
  // rows are removed (not reused) once their upload settles, so there's no
  // risk of a stale closure re-firing on a later file.
  useEffect(() => {
    let cancelled = false;
    upload(file, { kind: "VEHICLE_PHOTO", vehicleId })
      .then(async (url) => {
        if (cancelled) return;
        if (vehicleId) {
          await addVehiclePhotoAction(vehicleId, url);
          router.refresh();
        } else {
          onStaged?.(url);
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
  }, []); // intentionally once per row — file/vehicleId are fixed for its lifetime

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="truncate">{file.name}</span>
      {error ? (
        <span className="text-destructive">{error}</span>
      ) : (
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

type VehiclePhotoGalleryProps =
  | { mode: "persist"; vehicleId: string; photos: VehiclePhotoListItem[]; canEdit: boolean }
  | { mode: "stage"; photos: string[]; onChange: (urls: string[]) => void };

export function VehiclePhotoGallery(props: VehiclePhotoGalleryProps) {
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

  async function handleDelete(vehicleId: string, photoId: string) {
    setDeletingId(photoId);
    await deleteVehiclePhotoAction(vehicleId, photoId);
    setDeletingId(null);
    router.refresh();
  }

  const canEdit = props.mode === "persist" ? props.canEdit : true;

  // Normalized so the grid below has one render path regardless of mode —
  // "stage" photos are just URLs (no id/uploader/date until they're actually
  // persisted on save), "persist" photos carry the full server record.
  const items: { key: string; url: string; onDelete: (() => void) | null }[] =
    props.mode === "persist"
      ? props.photos.map((photo) => ({
          key: photo.id,
          url: photo.url,
          onDelete: canEdit ? () => handleDelete(props.vehicleId, photo.id) : null,
        }))
      : props.photos.map((url) => ({
          key: url,
          url,
          // No R2 cleanup here — same accepted "harmless orphan" tradeoff as
          // AuctionSheetUpload's stage mode when a staged file is replaced
          // before submit.
          onDelete: () => props.onChange(props.photos.filter((p) => p !== url)),
        }));

  return (
    <div className="space-y-3">
      {canEdit && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          Add Photos
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFilesSelected}
      />

      {inFlight.length > 0 && (
        <div className="space-y-1.5">
          {inFlight.map((file, i) => (
            <PhotoUploadRow
              key={`${file.name}-${i}`}
              vehicleId={props.mode === "persist" ? props.vehicleId : undefined}
              file={file}
              onSettled={() => handleRowSettled(file)}
              onStaged={
                props.mode === "stage" ? (url) => props.onChange([...props.photos, url]) : undefined
              }
            />
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Images className="size-4" />
          No photos yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {items.map((item) => (
            <div key={item.key} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
              <img
                src={item.url}
                alt=""
                className="aspect-square w-full rounded-md border border-border object-cover"
              />
              {item.onDelete && (
                <button
                  type="button"
                  aria-label="Delete photo"
                  disabled={deletingId === item.key}
                  onClick={item.onDelete}
                  className="absolute top-1 right-1 rounded-md bg-background/90 p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {deletingId === item.key ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
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
