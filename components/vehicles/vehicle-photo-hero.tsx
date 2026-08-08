"use client";

// Read-only photo viewer for the vehicle detail page (US-10): one large
// image with a thumbnail strip underneath to switch between photos. Not to
// be confused with VehiclePhotoGallery (components/shared/uploads/), which
// is the upload/manage grid used on the add/edit forms — this is a plain
// viewer with no upload, no delete, just look.

import { useState } from "react";
import { Images } from "lucide-react";
import { cn } from "@/lib/utils";

export function VehiclePhotoHero({ photos }: { photos: { id: string; url: string }[] }) {
  const [selected, setSelected] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border bg-muted text-muted-foreground">
        <Images className="size-8" />
        <p className="text-sm">No photos yet.</p>
      </div>
    );
  }

  const activePhoto = photos[Math.min(selected, photos.length - 1)];

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
      <img
        src={activePhoto.url}
        alt=""
        className="aspect-video w-full rounded-lg border object-cover"
      />
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === selected}
              className={cn(
                "shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                i === selected ? "border-primary" : "border-transparent"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
              <img src={photo.url} alt="" className="size-16 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
