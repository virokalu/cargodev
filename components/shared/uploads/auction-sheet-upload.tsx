"use client";

// Single-image upload for the Auction Sheet field (US-24: JPEG/PNG/WebP,
// ≤10MB, viewable full-size, replaceable). Two modes because the same field
// is written two different ways depending on where it's used:
//  - "stage": Add Vehicle form — no vehicleId exists yet, the uploaded URL
//    is just handed back via onChange and submitted with the rest of the
//    create payload (standard value/onChange shared-primitive shape).
//  - "persist": Edit page's Files panel — writes straight to the DB via
//    setAuctionSheetAction the moment the upload finishes, matching how
//    Photos/Documents behave (see vehicle-files-panel.tsx).

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFileUpload } from "@/components/shared/uploads/use-file-upload";
import { setAuctionSheetAction } from "@/app/(dashboard)/vehicles/actions";

type AuctionSheetUploadProps =
  | { mode: "stage"; value: string; onChange: (url: string) => void }
  | { mode: "persist"; vehicleId: string; currentUrl: string | null };

export function AuctionSheetUpload(props: AuctionSheetUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, progress, error, upload } = useFileUpload();

  const currentUrl = props.mode === "stage" ? props.value || null : props.currentUrl;

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const url = await upload(file, {
      kind: "AUCTION_SHEET",
      vehicleId: props.mode === "persist" ? props.vehicleId : undefined,
    }).catch(() => null);
    if (!url) return;

    if (props.mode === "stage") {
      props.onChange(url);
    } else {
      await setAuctionSheetAction(props.vehicleId, url);
      router.refresh();
    }
  }

  const uploading = status === "uploading";

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger
              render={<button type="button" className="shrink-0 rounded-md border border-border" />}
              aria-label="View auction sheet full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
              <img src={currentUrl} alt="Auction sheet" className="size-20 rounded-md object-cover" />
            </DialogTrigger>
            <DialogContent className="max-w-3xl sm:max-w-4xl">
              <DialogTitle>Auction Sheet</DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
              <img src={currentUrl} alt="Auction sheet, full size" className="max-h-[85vh] w-full object-contain" />
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Replace
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          Upload Auction Sheet
        </Button>
      )}

      {uploading && (
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
}
