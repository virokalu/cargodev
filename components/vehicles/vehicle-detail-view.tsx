// Vehicle detail page body (US-10). Server Component — everything here is
// read-only display of server-fetched data; the only interactivity (photo
// hero thumbnails, tabs) lives in small "use client" leaves
// (vehicle-photo-hero.tsx, ui/tabs.tsx) that this composes. No Edit/Delete
// here by design — those live on the table row and the edit page; this
// screen is look-only for every role, including Viewer.

import Link from "next/link";
import { ArrowLeft, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VehiclePhotoHero } from "@/components/vehicles/vehicle-photo-hero";
import { VehicleDocumentList } from "@/components/shared/uploads/vehicle-document-list";
import { TriStateCell } from "@/components/shared/tri-state-cell";
import { RowColourCell } from "@/components/shared/row-colour-cell";
import { SHIPMENT_STATUS_META } from "@/lib/constants/shipment-status";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { VehicleDetailData, StatusHistoryItem } from "@/lib/services/vehicle.service";
import type { VehicleFiles } from "@/lib/services/file.service";

interface VehicleDetailViewProps {
  vehicle: VehicleDetailData;
  files: VehicleFiles;
  statusHistory: StatusHistoryItem[];
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">
        {isEmpty ? <span className="text-muted-foreground">—</span> : value}
      </dd>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

export function VehicleDetailView({ vehicle, files, statusHistory }: VehicleDetailViewProps) {
  const isFC = vehicle.track === "FC";
  const titleParts = [vehicle.brand?.name, vehicle.model?.name].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join(" ") : vehicle.serial;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/vehicles"
            aria-label="Back to vehicles"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Car className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {vehicle.serial}
              {vehicle.yom ? ` · ${vehicle.yom}` : ""}
            </p>
          </div>
        </div>
        {isFC && (
          <Badge variant={SHIPMENT_STATUS_META[vehicle.shipmentStatus].badgeVariant} className="text-sm">
            {SHIPMENT_STATUS_META[vehicle.shipmentStatus].label}
          </Badge>
        )}
      </div>

      <div className={cn("grid gap-6", isFC && "lg:grid-cols-3")}>
        <div className={cn("space-y-6", isFC && "lg:col-span-2")}>
          <VehiclePhotoHero photos={files.photos} />

          <Tabs defaultValue="information">
            <TabsList>
              <TabsTrigger value="information">Information</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="information" className="space-y-6 rounded-lg border p-4">
              <FieldGroup title="Vehicle Information">
                <Field label="Chassis Number" value={vehicle.chassisNo} />
                <Field label="Make" value={vehicle.brand?.name} />
                <Field label="Model" value={vehicle.model?.name} />
                <Field label="Grade" value={vehicle.grade?.name} />
                <Field label="Year of Manufacture" value={vehicle.yom} />
                <Field label="Auction Hall" value={vehicle.auctionHall?.name} />
                <Field label="Purchase Date" value={formatDate(vehicle.purchaseDate)} />
                <Field label="Auction Lot No" value={vehicle.auctionLotNo} />
                <Field label="Customer" value={vehicle.customer?.name} />
                <Field label="Destination" value={vehicle.destination} />
              </FieldGroup>

              {isFC && (
                <FieldGroup title="Shipment Details">
                  <Field label="ETD" value={formatDate(vehicle.etd)} />
                  <Field label="ETA" value={formatDate(vehicle.eta)} />
                  <Field label="BL No" value={vehicle.blNo} />
                  <Field label="Forwarding Agent" value={vehicle.freightAgent?.name} />
                  <Field
                    label="RORO / Container"
                    value={
                      vehicle.shippingMethod === "RORO"
                        ? "RORO"
                        : vehicle.shippingMethod === "CONTAINER"
                          ? "Container"
                          : null
                    }
                  />
                  {vehicle.shippingMethod === "CONTAINER" && (
                    <Field label="Packing Agent" value={vehicle.packingAgent?.name} />
                  )}
                  <Field label="Tracking No" value={vehicle.trackingNo} />
                </FieldGroup>
              )}

              <FieldGroup title="Transport & Logistics">
                <Field label="Transport By" value={vehicle.transportBy?.name} />
                <Field label="Vehicle Location" value={vehicle.vehicleLocation?.name} />
                <Field label="Masso Date" value={formatDate(vehicle.massoDate)} />
                <Field label="Bill Number" value={vehicle.billNumber} />
                <Field label="LC No" value={vehicle.lcNo} />
                <Field label="Docs Arrived Date" value={formatDate(vehicle.docsArrivedDate)} />
              </FieldGroup>

              <FieldGroup title="Statuses & Flags">
                <Field label="Auction Bill Paid" value={<TriStateCell value={vehicle.auctionBillPaid} />} />
                <Field label="Log Book" value={<TriStateCell value={vehicle.logBook} />} />
                <Field label="Extra Key" value={<TriStateCell value={vehicle.extraKey} />} />
                <Field label="Name Change Deadline" value={formatDate(vehicle.nameChangeDeadline)} />
                <Field label="Row Colour Status" value={<RowColourCell status={vehicle.rowColourStatus} />} />
                <Field label="Doc Sent to Client" value={formatDate(vehicle.docSentDate)} />
                <Field label="Doc Sent Remark" value={vehicle.docSentComment} />
                <Field label="Recycle Date" value={formatDate(vehicle.recycleDate)} />
                <Field label="Jibaishake (自賠責)" value={vehicle.jibaishake} />
              </FieldGroup>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 rounded-lg border p-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold">Auction Sheet</h3>
                {files.auctionSheetUrl ? (
                  <Dialog>
                    <DialogTrigger
                      render={<button type="button" className="shrink-0 rounded-md border" />}
                      aria-label="View auction sheet full size"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
                      <img src={files.auctionSheetUrl} alt="Auction sheet" className="size-20 rounded-md object-cover" />
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogTitle>Auction Sheet</DialogTitle>
                      {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
                      <img
                        src={files.auctionSheetUrl}
                        alt="Auction sheet, full size"
                        className="max-h-[80vh] w-full object-contain"
                      />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <p className="text-sm text-muted-foreground">No auction sheet uploaded.</p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">Documents</h3>
                <VehicleDocumentList mode="persist" vehicleId={vehicle.id} documents={files.documents} canEdit={false} />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="rounded-lg border p-4">
              {vehicle.vehicleRemark ? (
                <p className="text-sm whitespace-pre-wrap">{vehicle.vehicleRemark}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No remarks recorded.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {isFC && (
          <div className="rounded-lg border p-4">
            <h2 className="mb-4 text-lg font-bold">Shipment Timeline</h2>
            {statusHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
            ) : (
              <ol className="space-y-4">
                {statusHistory.map((item, i) => (
                  <li key={item.id} className="relative pl-6">
                    {i < statusHistory.length - 1 && (
                      <span className="absolute top-5 left-[7px] h-full w-px bg-border" aria-hidden="true" />
                    )}
                    <span
                      className="absolute top-0.5 left-0 size-3.5 rounded-full border-2 border-primary bg-primary/20"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-semibold">{SHIPMENT_STATUS_META[item.toStatus].label}</p>
                    <p className="text-xs text-muted-foreground">{item.triggerLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.triggeredByName ?? "System"} · {formatDateTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
