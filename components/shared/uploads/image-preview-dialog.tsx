"use client";

// Full-size image viewer with a rotate control — shared by every place that
// pops open an uploaded image at full size (currently the Add/Edit form's
// Auction Sheet upload widget, the detail page's Auction Sheet, and the
// detail page's Vehicle Photos). Rotation is view-only and resets on close
// (and on navigating to a different image): it never writes anything back,
// it's just for reading a sheet that was scanned sideways or upside down.
//
// Always takes an `images` array — single-element for the two Auction Sheet
// callers (which only ever show one image), multi-element for Vehicle
// Photos. Arrow buttons and left/right keyboard navigation only render/
// activate when there's more than one image, so the single-image callers
// are unaffected.
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

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ImagePreviewDialogProps {
  title: string;
  images: { url: string; alt: string }[];
  /** Which image to open on — defaults to 0. Re-applied every time the
   * dialog opens (not just on mount), since this component instance
   * persists across multiple opens wherever the caller lets the "active"
   * image change between them (e.g. VehiclePhotoHero's thumbnail strip). */
  initialIndex?: number;
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
  images,
  initialIndex = 0,
  triggerAriaLabel,
  triggerClassName,
  children,
}: ImagePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rotation, setRotation] = useState(0);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const showPrevious = useCallback(() => {
    setCurrentIndex((previous) => (previous - 1 + images.length) % images.length);
    setRotation(0);
    setNatural(null);
  }, [images.length]);

  const showNext = useCallback(() => {
    setCurrentIndex((previous) => (previous + 1) % images.length);
    setRotation(0);
    setNatural(null);
  }, [images.length]);

  useEffect(() => {
    if (!open || !hasMultiple) return;
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") showPrevious();
      else if (event.key === "ArrowRight") showNext();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open, hasMultiple, showPrevious, showNext]);

  const current = images[currentIndex];
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
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setCurrentIndex(initialIndex);
        } else {
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
        <DialogTitle>{hasMultiple ? `${title} (${currentIndex + 1} of ${images.length})` : title}</DialogTitle>
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
          {hasMultiple && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute top-1/2 left-2 z-10 -translate-y-1/2 shadow"
                onClick={showPrevious}
                aria-label="Previous image"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute top-1/2 right-2 z-10 -translate-y-1/2 shadow"
                onClick={showNext}
                aria-label="Next image"
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
          <img
            src={current.url}
            alt={current.alt}
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
