"use client";

// Vehicle Files — Auction Sheet (replace), Photos and Documents. Lives only
// on the edit page, same reasoning the old VehicleRemarksPanel used: Photos
// and Documents need an existing vehicleId to attach to (non-nullable FK),
// so there's nothing to show here in create mode.

import { ImageIcon, Images, FileText } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { AuctionSheetUpload } from "@/components/shared/uploads/auction-sheet-upload";
import { VehiclePhotoGallery } from "@/components/shared/uploads/vehicle-photo-gallery";
import { VehicleDocumentList } from "@/components/shared/uploads/vehicle-document-list";
import type { VehicleFiles } from "@/lib/services/file.service";

interface VehicleFilesPanelProps {
  vehicleId: string;
  files: VehicleFiles;
  canEdit: boolean;
}

export function VehicleFilesPanel({ vehicleId, files, canEdit }: VehicleFilesPanelProps) {
  return (
    <div className="space-y-6">
      <SectionCard icon={ImageIcon} title="Auction Sheet" contentClassName="block">
        {canEdit ? (
          <AuctionSheetUpload mode="persist" vehicleId={vehicleId} currentUrl={files.auctionSheetUrl} />
        ) : files.auctionSheetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset
          <img src={files.auctionSheetUrl} alt="Auction sheet" className="size-20 rounded-md object-cover" />
        ) : (
          <p className="text-sm text-muted-foreground">No auction sheet uploaded.</p>
        )}
      </SectionCard>
      <SectionCard icon={Images} title="Vehicle Photos" contentClassName="block">
        <VehiclePhotoGallery vehicleId={vehicleId} photos={files.photos} canEdit={canEdit} />
      </SectionCard>
      <SectionCard icon={FileText} title="Documents" contentClassName="block">
        <VehicleDocumentList vehicleId={vehicleId} documents={files.documents} canEdit={canEdit} />
      </SectionCard>
    </div>
  );
}
