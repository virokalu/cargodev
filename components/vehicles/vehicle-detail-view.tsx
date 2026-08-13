// Vehicle detail page body (US-10). Server Component — everything here is
// read-only display of server-fetched data; the only interactivity (photo
// hero thumbnails, tabs) lives in small "use client" leaves
// (vehicle-photo-hero.tsx, ui/tabs.tsx) that this composes. No Edit/Delete
// here by design — those live on the table row and the edit page; this
// screen is look-only for every role, including Viewer.

import {
  Car,
  Ban,
  Banknote,
  Truck,
  FileCheck,
  Landmark,
  CalendarCheck,
  Boxes,
  Ship,
  PackageCheck,
  ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImagePreviewDialog } from "@/components/shared/uploads/image-preview-dialog";
import { VehiclePhotoHero } from "@/components/vehicles/vehicle-photo-hero";
import { VehicleDocumentList } from "@/components/shared/uploads/vehicle-document-list";
import { BackToVehiclesButton } from "@/components/vehicles/back-to-vehicles-button";
import { TriStateCell } from "@/components/shared/tri-state-cell";
import { RowColourCell } from "@/components/shared/row-colour-cell";
import { SHIPMENT_STATUS_META } from "@/lib/constants/shipment-status";
import { DOCUMENT_TYPE_META, NAMED_DOCUMENT_TYPES } from "@/lib/constants/document-type";
import { isCancelShipmentRowColour } from "@/lib/shipment-status";
import { buildShipmentMilestones, type ShipmentMilestoneKey } from "@/lib/shipment-milestones";
import { cn, formatDate } from "@/lib/utils";
import type { VehicleDetailData } from "@/lib/services/vehicle.service";
import type { VehicleFiles } from "@/lib/services/file.service";

interface VehicleDetailViewProps {
  vehicle: VehicleDetailData;
  files: VehicleFiles;
}

// Grouped by what actually happens at each step rather than one flat
// colour — paperwork/financial (Auction Bill Paid, LC Open) in primary,
// logistics arrangement (Rikso Given, Booking Received) in warning/amber,
// in-transit (Loaded, Shipped) in info/cyan, arrival (Delivered) in
// success/green. Reuses the app's existing semantic tokens (same ones the
// Shipment Status badges use) so it stays readable in dark mode for free,
// instead of inventing new colours with their own contrast to verify.
const MILESTONE_STYLE: Record<
  ShipmentMilestoneKey,
  { icon: React.ElementType; tone: "primary" | "warning" | "info" | "success" }
> = {
  AUCTION_BILL_PAID: { icon: Banknote, tone: "primary" },
  TRANSPORT_ASSIGNED: { icon: Truck, tone: "warning" },
  EC_RECEIVED: { icon: FileCheck, tone: "warning" },
  LC_OPEN: { icon: Landmark, tone: "primary" },
  BOOKING_RECEIVED: { icon: CalendarCheck, tone: "warning" },
  LOADED: { icon: Boxes, tone: "info" },
  SHIPPED: { icon: Ship, tone: "info" },
  DELIVERED: { icon: PackageCheck, tone: "success" },
};

const TONE_BADGE_CLASS: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
  success: "bg-success text-success-foreground",
};

const TONE_TEXT_CLASS: Record<string, string> = {
  primary: "text-primary",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

const TONE_LINE_CLASS: Record<string, string> = {
  primary: "bg-primary/50",
  warning: "bg-warning/50",
  info: "bg-info/50",
  success: "bg-success/50",
};

// The next step (first incomplete one) gets a light tint in its eventual
// colour instead of plain grey — "coming up" reads differently from "not
// relevant yet," which a flat done/not-done treatment couldn't show.
const TONE_TINT_CLASS: Record<string, string> = {
  primary: "border-primary/40 bg-primary/10 text-primary",
  warning: "border-warning/40 bg-warning/10 text-warning",
  info: "border-info/40 bg-info/10 text-info",
  success: "border-success/40 bg-success/10 text-success",
};

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
      <h3 className="mb-3 border-l-2 border-primary pl-2 text-base font-semibold text-foreground">{title}</h3>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

export function VehicleDetailView({ vehicle, files }: VehicleDetailViewProps) {
  const isFC = vehicle.track === "FC";
  const titleParts = [vehicle.brand?.name, vehicle.model?.name].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join(" ") : vehicle.serial;
  // EC Received completes the moment the first EC-type document is
  // uploaded — there's no dedicated Vehicle column for it, so it's derived
  // from files.documents instead (see ShipmentMilestoneInput.ecReceivedAt).
  const ecDocuments = files.documents
    .filter((document) => document.documentType === "EC")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const ecReceivedAt = ecDocuments[0]?.createdAt ?? null;
  const milestones = buildShipmentMilestones({
    auctionBillPaid: vehicle.auctionBillPaid,
    transportBy: vehicle.transportBy,
    lcNo: vehicle.lcNo,
    etd: vehicle.etd,
    eta: vehicle.eta,
    destination: vehicle.destination,
    ecReceivedAt,
  });
  const nextMilestoneIndex = milestones.findIndex((m) => !m.completed);
  // Unit Canceled / Resold in Auction (see CANCEL_SHIPMENT_ROW_COLOUR_NAMES
  // in lib/shipment-status.ts) mean none of the milestones above still
  // apply — the deal fell through, it isn't just "not there yet." The
  // header badge already shows the generic "Shipment Cancelled" status;
  // this panel shows *which one specifically* happened, tinted with that
  // row colour status's own configured colour instead of a flat red, so it
  // reads consistently with how the table itself colours the row.
  const cancelledRowColour =
    vehicle.rowColourStatus && isCancelShipmentRowColour(vehicle.rowColourStatus.name) ? vehicle.rowColourStatus : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackToVehiclesButton />
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
          <div className="rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold">Auction Sheet</h3>
                {files.auctionSheetUrl ? (
                  <ImagePreviewDialog
                    title="Auction Sheet"
                    src={files.auctionSheetUrl}
                    alt="Auction sheet, full size"
                    triggerAriaLabel="View auction sheet full size"
                    triggerClassName="block w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- external R2 URL, not a local asset */}
                    <img
                      src={files.auctionSheetUrl}
                      alt="Auction sheet"
                      className="aspect-video w-full rounded-lg border object-cover"
                    />
                  </ImagePreviewDialog>
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border bg-muted text-muted-foreground">
                    <ImageIcon className="size-8" />
                    <p className="text-sm">No auction sheet uploaded.</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">Vehicle Photos</h3>
                <VehiclePhotoHero photos={files.photos} />
              </div>
            </div>
          </div>

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
                <Field label="Auction Bill Paid" value={<TriStateCell value={vehicle.auctionBillPaid} />} />
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
                  <Field label="LC No" value={vehicle.lcNo} />
                </FieldGroup>
              )}

              <FieldGroup title="Transport & Logistics">
                <Field label="Transport By" value={vehicle.transportBy?.name} />
                <Field label="Vehicle Location" value={vehicle.vehicleLocation?.name} />
                <Field label="Docs Arrived Date" value={formatDate(vehicle.docsArrivedDate)} />
                <Field label="Name Change Deadline" value={formatDate(vehicle.nameChangeDeadline)} />
                <Field label="Extra Key" value={<TriStateCell value={vehicle.extraKey} />} />
                <Field label="Log Book" value={<TriStateCell value={vehicle.logBook} />} />
                <Field label="Masso Date" value={formatDate(vehicle.massoDate)} />
                <Field label="Doc Sent to Client" value={formatDate(vehicle.docSentDate)} />
                <Field label="Doc Sent Remark" value={vehicle.docSentComment} />
              </FieldGroup>

              <FieldGroup title="Statuses & Flags">
                <Field label="Row Colour Status" value={<RowColourCell status={vehicle.rowColourStatus} />} />
                <Field label="Recycle Date" value={formatDate(vehicle.recycleDate)} />
                <Field label="Jibaishake (自賠責)" value={vehicle.jibaishake} />
              </FieldGroup>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 rounded-lg border p-4">
              {NAMED_DOCUMENT_TYPES.map((documentType) => (
                <div key={documentType}>
                  <h3 className="mb-3 text-sm font-semibold">{DOCUMENT_TYPE_META[documentType].label}</h3>
                  <VehicleDocumentList
                    mode="persist"
                    vehicleId={vehicle.id}
                    documentType={documentType}
                    label={DOCUMENT_TYPE_META[documentType].label}
                    documents={files.documents.filter((document) => document.documentType === documentType)}
                    canEdit={false}
                  />
                </div>
              ))}
              <div>
                <h3 className="mb-3 text-sm font-semibold">{DOCUMENT_TYPE_META.OTHER.label}</h3>
                <VehicleDocumentList
                  mode="persist"
                  vehicleId={vehicle.id}
                  documentType="OTHER"
                  label={DOCUMENT_TYPE_META.OTHER.label}
                  documents={files.documents.filter((document) => document.documentType === "OTHER")}
                  canEdit={false}
                />
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
          <div className="self-start rounded-lg border p-4">
            <h2 className="mb-4 text-lg font-bold">Shipment Timeline</h2>
            {cancelledRowColour ? (
              <div
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed py-8 text-center"
                style={{
                  borderColor: cancelledRowColour.colour,
                  backgroundColor: `color-mix(in oklch, ${cancelledRowColour.colour} 12%, transparent)`,
                }}
              >
                <Ban className="size-8" style={{ color: cancelledRowColour.colour }} aria-hidden="true" />
                <div>
                  <p className="text-base font-bold" style={{ color: cancelledRowColour.colour }}>
                    {cancelledRowColour.name}
                  </p>
                  <p className="mt-1 px-4 text-xs text-muted-foreground">
                    Shipment tracking milestones no longer apply to this vehicle.
                  </p>
                </div>
              </div>
            ) : (
            <ol className="space-y-5">
              {milestones.map((milestone, i) => {
                const { icon: Icon, tone } = MILESTONE_STYLE[milestone.key];
                const isNext = i === nextMilestoneIndex;
                return (
                  <li key={milestone.key} className="relative pl-11">
                    {i < milestones.length - 1 && (
                      <span
                        className={cn(
                          "absolute top-8 -bottom-5 left-4 w-px",
                          milestone.completed ? TONE_LINE_CLASS[tone] : "bg-border"
                        )}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        "absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border-2",
                        milestone.completed
                          ? cn("border-transparent", TONE_BADGE_CLASS[tone])
                          : isNext
                            ? cn("border-dashed", TONE_TINT_CLASS[tone])
                            : "border-dashed border-muted-foreground/25 text-muted-foreground/40"
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <p
                      className={cn(
                        "pt-1.5 text-sm font-semibold",
                        milestone.completed
                          ? TONE_TEXT_CLASS[tone]
                          : isNext
                            ? TONE_TEXT_CLASS[tone]
                            : "text-muted-foreground"
                      )}
                    >
                      {milestone.label}
                    </p>
                    {milestone.date && <p className="text-xs text-muted-foreground">{formatDate(milestone.date)}</p>}
                  </li>
                );
              })}
            </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
