"use client";

// Full-size image viewer with a rotate control — shared by every place that
// pops open an uploaded image at full size (currently both Auction Sheet
// spots: the Add/Edit form's upload widget and the read-only detail page).
// Rotation is view-only and resets on close: it never writes anything back,
// it's just for reading a sheet that was scanned sideways or upside down.
//
// WHY the box/dialog resize themselves at 90°/270°: CSS `transform:
// rotate()` only repaints the element — it never changes the layout box, so
// a naive rotate-in-place leaves the dialog sized for the image's ORIGINAL
// orientation, which is exactly backwards once rotated onto its side (a
// tall dialog around an image that's now lying flat). So the dialog and its
// image box are resized from the image's real (naturalWidth/naturalHeight)
// dimensions, swapped, to hug the actual rotated bounding box.
//
// Every branch below always applies SOME max-height/max-width to the image
// — never nothing — because naturalWidth/naturalHeight aren't known until
// the image's onLoad fires. Without a fallback, rotating right as the
// dialog opens (before that fires) would render the image at full native
// pixel size with no constraint at all, which is what "image goes out of
// the box" was.

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ImagePreviewDialogProps {
  title: string;
  src: string;
  alt: string;
  triggerAriaLabel: string;
  triggerClassName?: string;
  /** The trigger's visual content — a small thumbnail in one place, a big
   * aspect-video preview in another, so the caller owns that markup. */
  children: React.ReactNode;
}

// Leaves a visible margin around the dialog at any rotation instead of it
// touching the screen edges.
const MAX_VIEWPORT_WIDTH_RATIO = 0.85;
const MAX_VIEWPORT_HEIGHT_RATIO = 0.75;
// Used whenever the real dimensions aren't known yet — same reasoning as
// the 0°/180° case's own fixed cap, just as a temporary stand-in.
const FALLBACK_MAX_WIDTH = "70vw";
const FALLBACK_MAX_HEIGHT = "70vh";

export function ImagePreviewDialog({
  title,
  src,
  alt,
  triggerAriaLabel,
  triggerClassName,
  children,
}: ImagePreviewDialogProps) {
  const [rotation, setRotation] = useState(0);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const isSideways = rotation === 90 || rotation === 270;

  // Dialog width is never set directly — DialogContent has its own padding
  // (p-4), and setting an inline width equal to the box's width would make
  // that padding eat into space already promised to the box (border-box
  // sizing), overflowing it by exactly the padding amount. `w-fit` instead
  // lets the browser size the dialog around its actual child content,
  // padding included, automatically.
  let dialogClassName = "max-w-3xl sm:max-w-4xl";
  let boxStyle: React.CSSProperties = { maxWidth: FALLBACK_MAX_WIDTH, maxHeight: FALLBACK_MAX_HEIGHT };
  let imgStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    maxWidth: FALLBACK_MAX_WIDTH,
    maxHeight: FALLBACK_MAX_HEIGHT,
  };

  if (isSideways && natural && viewport) {
    // Fit the VISUAL (post-rotation) box against the viewport — width and
    // height swapped, since that's what 90°/270° does to the image's
    // apparent shape.
    const maxW = viewport.width * MAX_VIEWPORT_WIDTH_RATIO;
    const maxH = viewport.height * MAX_VIEWPORT_HEIGHT_RATIO;
    const scale = Math.min(maxW / natural.height, maxH / natural.width, 1);
    const imgWidth = natural.width * scale;
    const imgHeight = natural.height * scale;

    dialogClassName = "w-fit max-w-[90vw] sm:max-w-[90vw]";
    boxStyle = { width: imgHeight, height: imgWidth };
    imgStyle = { transform: `rotate(${rotation}deg)`, width: imgWidth, height: imgHeight };
  } else if (!isSideways) {
    // 0°/180° never change the bounding box's shape, so the plain
    // always-correct max-h/max-w is enough — no natural-size math needed.
    boxStyle = {};
    imgStyle = { transform: `rotate(${rotation}deg)`, maxHeight: "85vh", width: "100%" };
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setRotation(0);
          setNatural(null);
        }
      }}
    >
      <DialogTrigger
        render={<button type="button" className={triggerClassName} />}
        aria-label={triggerAriaLabel}
      >
        {children}
      </DialogTrigger>
      <DialogContent className={dialogClassName}>
        <DialogTitle>{title}</DialogTitle>
        <div
          className="relative mx-auto flex items-center justify-center overflow-hidden rounded-lg bg-muted/30"
          style={boxStyle}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-2 left-2 z-10 shadow"
            onClick={() => setRotation((previous) => (previous + 90) % 360)}
            aria-label="Rotate image 90 degrees"
          >
            <RotateCw className="size-4" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
          <img
            src={src}
            alt={alt}
            onLoad={(event) => {
              const target = event.currentTarget;
              setNatural({ width: target.naturalWidth, height: target.naturalHeight });
            }}
            className="object-contain"
            style={imgStyle}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
