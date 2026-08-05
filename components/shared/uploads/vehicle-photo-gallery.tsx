"use client";

// Vehicle Photos — multi-image upload with per-file progress + a gallery
// grid with per-photo delete (US-25). Edit-mode only: a photo's vehicleId FK
// can't point at a vehicle that doesn't exist yet, same reasoning the old
// VehicleRemarksPanel used for remarks.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Images, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/components/shared/uploads/use-file-upload";
import { addVehiclePhotoAction, deleteVehiclePhotoAction } from "@/app/(dashboard)/vehicles/actions";
import type { VehiclePhotoListItem } from "@/lib/services/file.service";

interface PhotoUploadRowProps {
  vehicleId: string;
  file: File;
  onSettled: () => void;
}

/** Owns its own upload hook so N simultaneous uploads get independent
 * progress bars without the parent having to track a list of them. */
function PhotoUploadRow({ vehicleId, file, onSettled }: PhotoUploadRowProps) {
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
        await addVehiclePhotoAction(vehicleId, url);
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

interface VehiclePhotoGalleryProps {
  vehicleId: string;
  photos: VehiclePhotoListItem[];
  canEdit: boolean;
}

export function VehiclePhotoGallery({ vehicleId, photos, canEdit }: VehiclePhotoGalleryProps) {
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

  async function handleDelete(photoId: string) {
    setDeletingId(photoId);
    await deleteVehiclePhotoAction(vehicleId, photoId);
    setDeletingId(null);
    router.refresh();
  }

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
              vehicleId={vehicleId}
              file={file}
              onSettled={() => handleRowSettled(file)}
            />
          ))}
        </div>
      )}

      {photos.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Images className="size-4" />
          No photos yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
              <img
                src={photo.url}
                alt=""
                className="aspect-square w-full rounded-md border border-border object-cover"
              />
              {canEdit && (
                <button
                  type="button"
                  aria-label="Delete photo"
                  disabled={deletingId === photo.id}
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-1 right-1 rounded-md bg-background/90 p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {deletingId === photo.id ? (
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
