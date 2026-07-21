"use client";

// Add Vehicle form — client component. Owns one form-state object and maps
// server-side field errors under each input. Layout follows the approved
// design (docs/designs/…10.21.10 AM (2).jpeg): cards in a 2/3 + 1/3 grid on
// desktop, single column on mobile — field CONTENT follows
// docs/technical-documentation.md §2 instead of the old generic mockup
// fields, per CLAUDE.md.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Fingerprint,
  Car,
  Ship,
  Truck,
  ClipboardList,
  Loader2,
  AlertTriangle,
  Save,
  ChevronDown,
} from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TriStateToggle } from "@/components/shared/tri-state-toggle";
import { DateField } from "@/components/shared/date-field";
import { ComboboxCreate, type ComboboxOption } from "@/components/shared/combobox-create";
import { FreightAgentCombobox } from "@/components/shared/freight-agent-combobox";
import { CountrySelect } from "@/components/shared/country-select";
import { cn } from "@/lib/utils";
import type { CountryOption } from "@/lib/constants/countries";
import type { FreightAgentOption, LookupOption } from "@/lib/services/lookup.service";
import {
  createVehicleAction,
  checkChassisDuplicateAction,
  searchBrandsAction,
  createBrandAction,
  renameBrandAction,
  searchModelsAction,
  createModelAction,
  renameModelAction,
  searchGradesAction,
  createGradeAction,
  renameGradeAction,
  searchAuctionHallsAction,
  createAuctionHallAction,
  renameAuctionHallAction,
  searchTransportCompaniesAction,
  createTransportCompanyAction,
  renameTransportCompanyAction,
  searchVehicleLocationsAction,
  createVehicleLocationAction,
  renameVehicleLocationAction,
  searchFreightAgentsAction,
  createFreightAgentAction,
  updateFreightAgentAction,
  searchCustomersAction,
  createCustomerAction,
} from "@/app/(dashboard)/vehicles/actions";

type RowColourStatusOption = LookupOption & { colour: string; transportCellOnly: boolean };

type ShipmentStatus = "PENDING" | "BOOKING_RECEIVED" | "SHIPPED";

// Colours mirror the Badge component's own success/warning/info variants
// (app/globals.css) so this status reads the same wherever it shows up.
const SHIPMENT_STATUS_META: Record<
  ShipmentStatus,
  { label: string; badgeVariant: "warning" | "info" | "success" }
> = {
  PENDING: { label: "Pending", badgeVariant: "warning" },
  BOOKING_RECEIVED: { label: "Booking Received", badgeVariant: "info" },
  SHIPPED: { label: "Shipped", badgeVariant: "success" },
};

interface AddVehicleFormProps {
  nextFcSerial: string;
  nextFlSerial: string;
  rowColourStatuses: RowColourStatusOption[];
  countries: CountryOption[];
}

interface FormState {
  track: "FC" | "FL";
  isLegacyEntry: boolean;
  legacySerialNumberText: string;
  // Only used (and only shown) when isLegacyEntry && track === "FC" — a
  // legacy record wasn't tracked through the real ETD flow, so staff pick
  // the status it actually reached instead of everything starting Pending.
  manualShipmentStatus: ShipmentStatus;

  auctionItemNo: string;
  chassisNo: string;
  brand: ComboboxOption | null;
  model: ComboboxOption | null;
  grade: ComboboxOption | null;
  yomText: string;
  auctionHall: ComboboxOption | null;
  purchaseDate: string | null;
  auctionLotNo: string;
  customer: ComboboxOption | null;
  destination: string;

  etd: string | null;
  eta: string | null;
  blNo: string;
  freightAgent: FreightAgentOption | null;
  shippingMethod: "" | "RORO" | "CONTAINER";
  trackingNo: string;

  transportBy: ComboboxOption | null;
  vehicleLocation: ComboboxOption | null;
  massoDate: string | null;
  billNumber: string;
  lcNo: string;
  docsArrivedDate: string | null;

  auctionBillPaid: boolean | null;
  logBook: boolean | null;
  extraKey: boolean | null;
  nameChangeDeadline: string | null;
  rowColourStatusId: string;
  docSentDate: string | null;
  docSentComment: string;
  recycleDate: string | null;
  jibaishake: string;
}

const INITIAL_STATE: FormState = {
  track: "FC",
  isLegacyEntry: false,
  legacySerialNumberText: "",
  manualShipmentStatus: "PENDING",

  auctionItemNo: "",
  chassisNo: "",
  brand: null,
  model: null,
  grade: null,
  yomText: "",
  auctionHall: null,
  purchaseDate: null,
  auctionLotNo: "",
  customer: null,
  destination: "",

  etd: null,
  eta: null,
  blNo: "",
  freightAgent: null,
  shippingMethod: "",
  trackingNo: "",

  transportBy: null,
  vehicleLocation: null,
  massoDate: null,
  billNumber: "",
  lcNo: "",
  docsArrivedDate: null,

  auctionBillPaid: null,
  logBook: null,
  extraKey: null,
  nameChangeDeadline: null,
  rowColourStatusId: "",
  docSentDate: null,
  docSentComment: "",
  recycleDate: null,
  jibaishake: "",
};

/** Builds the raw payload the server's vehicleCreateSchema expects. */
function buildPayload(state: FormState) {
  const yom = state.yomText.trim() === "" ? null : Number.parseInt(state.yomText, 10);
  const legacySerialNumber =
    state.legacySerialNumberText.trim() === ""
      ? null
      : Number.parseInt(state.legacySerialNumberText, 10);

  const isFC = state.track === "FC";

  return {
    track: state.track,
    isLegacyEntry: state.isLegacyEntry,
    legacySerialNumber: Number.isNaN(legacySerialNumber) ? null : legacySerialNumber,
    // Server ignores this unless isLegacyEntry && track === "FC" — sending it
    // otherwise would be meaningless since status stays derived from ETD.
    shipmentStatus: state.isLegacyEntry && isFC ? state.manualShipmentStatus : null,

    auctionItemNo: state.auctionItemNo,
    chassisNo: state.chassisNo,
    brandId: state.brand?.id ?? "",
    modelId: state.model?.id ?? "",
    gradeId: state.grade?.id ?? null,
    yom: Number.isNaN(yom) ? null : yom,
    auctionHallId: state.auctionHall?.id ?? null,
    purchaseDate: state.purchaseDate,
    auctionLotNo: state.auctionLotNo,
    customerId: state.customer?.id ?? null,
    destination: state.destination,

    etd: state.etd,
    eta: state.eta,
    blNo: state.blNo,
    freightAgentId: state.freightAgent?.id ?? null,
    shippingMethod: state.shippingMethod || null,
    trackingNo: state.trackingNo,

    transportById: state.transportBy?.id ?? null,
    vehicleLocationId: state.vehicleLocation?.id ?? null,
    massoDate: state.massoDate,
    billNumber: state.billNumber,
    lcNo: state.lcNo,
    docsArrivedDate: state.docsArrivedDate,

    auctionBillPaid: state.auctionBillPaid,
    logBook: state.logBook,
    extraKey: state.extraKey,
    nameChangeDeadline: state.nameChangeDeadline,
    rowColourStatusId: state.rowColourStatusId || null,
    docSentDate: state.docSentDate,
    docSentComment: state.docSentComment,
    recycleDate: state.recycleDate,
    jibaishake: state.jibaishake,
  };
}

function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  required,
  error,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={error ? "border-destructive" : undefined}
        aria-invalid={!!error}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  min,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={error ? "border-destructive" : undefined}
        aria-invalid={!!error}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  // Each card minimizes independently — staff filling a long form can collapse
  // sections they've already finished without losing what's in them (fields
  // keep their values while hidden, they're just not rendered).
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Icon className="size-5 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
            aria-label={open ? `Minimize ${title}` : `Expand ${title}`}
          >
            <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          </Button>
        </CardAction>
      </CardHeader>
      {open && <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>}
    </Card>
  );
}

export function AddVehicleForm({
  nextFcSerial,
  nextFlSerial,
  rowColourStatuses,
  countries,
}: AddVehicleFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [chassisDuplicate, setChassisDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  const isFC = state.track === "FC";
  const nextSerialPreview = state.track === "FC" ? nextFcSerial : nextFlSerial;

  // Same "documented exception" as the server (vehicle.service.ts): a legacy
  // FC record's real status is picked by hand instead of derived from ETD.
  const canSetShipmentStatusManually = isFC && state.isLegacyEntry;
  const derivedShipmentStatus: ShipmentStatus = isFC && state.etd ? "BOOKING_RECEIVED" : "PENDING";
  const shipmentStatus = canSetShipmentStatusManually
    ? state.manualShipmentStatus
    : derivedShipmentStatus;

  async function handleChassisBlur() {
    const trimmed = state.chassisNo.trim();
    if (!trimmed) {
      setChassisDuplicate(false);
      return;
    }
    const isDuplicate = await checkChassisDuplicateAction(trimmed);
    setChassisDuplicate(isDuplicate);
  }

  // Freight Agent and RORO/Container can be filled in either order (staff
  // sometimes know the shipping method before they've picked an agent).
  // Whichever one changes, drop the other if it's no longer a valid
  // combination — the server re-checks this regardless (CLAUDE.md rule 4),
  // but resetting here avoids a confusing round trip through a field error.
  function handleFreightAgentChange(agent: FreightAgentOption | null) {
    setState((previous) => {
      const methodStillValid =
        !agent || previous.shippingMethod === ""
          ? true
          : previous.shippingMethod === "RORO"
            ? agent.offersRoro
            : agent.offersContainer;
      return {
        ...previous,
        freightAgent: agent,
        shippingMethod: methodStillValid ? previous.shippingMethod : "",
      };
    });
  }

  function handleShippingMethodChange(method: "" | "RORO" | "CONTAINER") {
    setState((previous) => {
      const agentStillValid =
        !previous.freightAgent || method === ""
          ? true
          : method === "RORO"
            ? previous.freightAgent.offersRoro
            : previous.freightAgent.offersContainer;
      return {
        ...previous,
        shippingMethod: method,
        freightAgent: agentStillValid ? previous.freightAgent : null,
      };
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setBannerError(null);
    setFieldErrors({});

    const result = await createVehicleAction(buildPayload(state));

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setBannerError(result.message);
      setSubmitting(false);
      return;
    }

    router.push("/vehicles");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Add Vehicle</h1>
          <p className="text-muted-foreground">Register a new vehicle record.</p>
        </div>
      </div>

      {bannerError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{bannerError}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Serial & Track ─────────────────────────────────────── */}
          <SectionCard icon={Fingerprint} title="Serial & Track">
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold">Track</span>
              <div className="inline-flex gap-1 rounded-md bg-muted p-1">
                {(["FC", "FL"] as const).map((track) => (
                  <button
                    key={track}
                    type="button"
                    onClick={() => setField("track", track)}
                    className={cn(
                      "min-w-24 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
                      state.track === track
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {track === "FC" ? "FC — Export" : "FL — Local"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {isFC
                  ? "Export vehicle — full shipping lifecycle tracked."
                  : "Local vehicle — sold locally, no shipping fields tracked."}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="isLegacyEntry"
                type="checkbox"
                checked={state.isLegacyEntry}
                onChange={(event) => setField("isLegacyEntry", event.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <Label htmlFor="isLegacyEntry" className="font-normal">
                Enter a legacy serial number manually
              </Label>
            </div>

            {state.isLegacyEntry ? (
              <NumberField
                id="legacySerialNumber"
                label={`Legacy Serial Number (after ${state.track})`}
                value={state.legacySerialNumberText}
                onChange={(value) => setField("legacySerialNumberText", value)}
                error={fieldErrors.legacySerialNumber}
                min={1}
              />
            ) : (
              <div>
                <span className="mb-1.5 block text-sm font-semibold">Next Serial</span>
                <Badge variant="outline" className="font-mono text-sm">
                  {nextSerialPreview}
                </Badge>
              </div>
            )}

            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold">Shipment Status</span>
              {canSetShipmentStatusManually ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(SHIPMENT_STATUS_META) as ShipmentStatus[]).map((status) => {
                      const meta = SHIPMENT_STATUS_META[status];
                      const active = state.manualShipmentStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setField("manualShipmentStatus", status)}
                          className={cn(
                            active
                              ? badgeVariants({ variant: meta.badgeVariant })
                              : badgeVariants({ variant: "outline" }),
                            "cursor-pointer transition-colors",
                            !active && "text-muted-foreground hover:text-foreground"
                          )}
                          aria-pressed={active}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Legacy record — set the status this vehicle actually reached, since it wasn&apos;t
                    tracked through the normal ETD flow.
                  </p>
                </>
              ) : (
                <Badge variant={SHIPMENT_STATUS_META[shipmentStatus].badgeVariant}>
                  {SHIPMENT_STATUS_META[shipmentStatus].label}
                </Badge>
              )}
            </div>
          </SectionCard>

          {/* ── Vehicle Information ────────────────────────────────── */}
          <SectionCard icon={Car} title="Vehicle Information">
            <TextField
              id="auctionItemNo"
              label="Auction Item No"
              value={state.auctionItemNo}
              onChange={(value) => setField("auctionItemNo", value)}
              maxLength={100}
            />
            <TextField
              id="chassisNo"
              label="Chassis Number"
              required
              value={state.chassisNo}
              onChange={(value) => setField("chassisNo", value)}
              onBlur={handleChassisBlur}
              error={fieldErrors.chassisNo}
              placeholder="JT123456789X"
              maxLength={100}
            />
            {chassisDuplicate && !fieldErrors.chassisNo && (
              <div className="sm:col-span-2 -mt-2 flex items-center gap-2 text-xs text-warning-foreground">
                <AlertTriangle className="size-3.5 shrink-0" />
                A vehicle with this chassis number already exists — you can still save.
              </div>
            )}

            <ComboboxCreate
              id="brand"
              label="Make"
              required
              createLabel="brand"
              value={state.brand}
              onChange={(brand) => setState((s) => ({ ...s, brand, model: null, grade: null }))}
              search={searchBrandsAction}
              onCreate={createBrandAction}
              onRename={(option, name) => renameBrandAction(option.id, name)}
              placeholder="Toyota"
              error={fieldErrors.brandId}
            />
            <ComboboxCreate
              key={state.brand?.id ?? "no-brand"}
              id="model"
              label="Model"
              required
              createLabel="model"
              value={state.model}
              onChange={(model) => setState((s) => ({ ...s, model, grade: null }))}
              search={(query) => searchModelsAction(state.brand?.id ?? "", query)}
              onCreate={(name) => createModelAction(state.brand?.id ?? "", name)}
              onRename={(option, name) => renameModelAction(option.id, name)}
              placeholder="Land Cruiser"
              disabled={!state.brand}
              disabledHint="Select a make first"
              error={fieldErrors.modelId}
            />
            <ComboboxCreate
              key={state.model?.id ?? "no-model"}
              id="grade"
              label="Grade"
              createLabel="grade"
              value={state.grade}
              onChange={(grade) => setField("grade", grade)}
              search={(query) => searchGradesAction(state.model?.id ?? "", query)}
              onCreate={(name) => createGradeAction(state.model?.id ?? "", name)}
              onRename={(option, name) => renameGradeAction(option.id, name)}
              placeholder="ZX"
              disabled={!state.model}
              disabledHint="Select a model first"
            />
            <NumberField
              id="yom"
              label="Year of Manufacture"
              value={state.yomText}
              onChange={(value) => setField("yomText", value)}
              error={fieldErrors.yom}
              min={1980}
              max={new Date().getFullYear() + 1}
            />

            <ComboboxCreate
              id="auctionHall"
              label="Auction Hall"
              createLabel="auction hall"
              value={state.auctionHall}
              onChange={(value) => setField("auctionHall", value)}
              search={searchAuctionHallsAction}
              onCreate={createAuctionHallAction}
              onRename={(option, name) => renameAuctionHallAction(option.id, name)}
            />
            <DateField
              id="purchaseDate"
              label="Purchase Date"
              value={state.purchaseDate}
              onChange={(value) => setField("purchaseDate", value)}
            />
            <TextField
              id="auctionLotNo"
              label="Auction Lot No"
              value={state.auctionLotNo}
              onChange={(value) => setField("auctionLotNo", value)}
              maxLength={100}
            />
            <ComboboxCreate
              id="customer"
              label="Customer"
              createLabel="customer"
              value={state.customer}
              onChange={(value) => setField("customer", value)}
              search={searchCustomersAction}
              onCreate={createCustomerAction}
              error={fieldErrors.customerId}
            />
            <CountrySelect
              id="destination"
              label="Destination"
              options={countries}
              value={state.destination}
              onChange={(name) => setField("destination", name)}
            />
          </SectionCard>

          {/* ── Shipment Details (FC only) ─────────────────────────── */}
          {isFC && (
            <SectionCard
              icon={Ship}
              title="Shipment Details"
              description="Setting an ETD moves this vehicle to Booking Received automatically."
            >
              <DateField
                id="etd"
                label="ETD"
                value={state.etd}
                onChange={(value) => setField("etd", value)}
              />
              <DateField
                id="eta"
                label="ETA"
                value={state.eta}
                onChange={(value) => setField("eta", value)}
              />
              <TextField
                id="blNo"
                label="BL No"
                value={state.blNo}
                onChange={(value) => setField("blNo", value)}
                maxLength={100}
              />
              <FreightAgentCombobox
                id="freightAgentId"
                label="Freight Agent"
                value={state.freightAgent}
                onChange={handleFreightAgentChange}
                search={(query) => searchFreightAgentsAction(query, state.shippingMethod || undefined)}
                onCreate={createFreightAgentAction}
                onUpdate={(option, name, offersRoro, offersContainer) =>
                  updateFreightAgentAction(option.id, name, offersRoro, offersContainer)
                }
                error={fieldErrors.freightAgentId}
              />
              <div>
                <Label htmlFor="shippingMethod" className="mb-1.5">
                  RORO / Container
                </Label>
                <Select
                  value={state.shippingMethod}
                  onValueChange={(value) => handleShippingMethodChange(value as "RORO" | "CONTAINER")}
                >
                  <SelectTrigger id="shippingMethod" className="w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {(!state.freightAgent || state.freightAgent.offersRoro) && (
                      <SelectItem value="RORO">RORO</SelectItem>
                    )}
                    {(!state.freightAgent || state.freightAgent.offersContainer) && (
                      <SelectItem value="CONTAINER">Container</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {fieldErrors.shippingMethod && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.shippingMethod}</p>
                )}
              </div>
              <TextField
                id="trackingNo"
                label="Tracking No"
                value={state.trackingNo}
                onChange={(value) => setField("trackingNo", value)}
                maxLength={100}
              />
            </SectionCard>
          )}

          {/* ── Transport & Logistics ──────────────────────────────── */}
          <SectionCard icon={Truck} title="Transport & Logistics">
            <ComboboxCreate
              id="transportBy"
              label="Transport By"
              createLabel="transport company"
              value={state.transportBy}
              onChange={(value) => setField("transportBy", value)}
              search={searchTransportCompaniesAction}
              onCreate={createTransportCompanyAction}
              onRename={(option, name) => renameTransportCompanyAction(option.id, name)}
            />
            <ComboboxCreate
              id="vehicleLocation"
              label="Vehicle Location"
              createLabel="location"
              value={state.vehicleLocation}
              onChange={(value) => setField("vehicleLocation", value)}
              search={searchVehicleLocationsAction}
              onCreate={createVehicleLocationAction}
              onRename={(option, name) => renameVehicleLocationAction(option.id, name)}
            />
            <DateField
              id="massoDate"
              label="Masso Date"
              value={state.massoDate}
              onChange={(value) => setField("massoDate", value)}
            />
            <TextField
              id="billNumber"
              label="Bill Number"
              value={state.billNumber}
              onChange={(value) => setField("billNumber", value)}
              maxLength={100}
            />
            <TextField
              id="lcNo"
              label="LC No"
              value={state.lcNo}
              onChange={(value) => setField("lcNo", value)}
              maxLength={100}
            />
            <DateField
              id="docsArrivedDate"
              label="Docs Arrived Date"
              value={state.docsArrivedDate}
              onChange={(value) => setField("docsArrivedDate", value)}
            />
          </SectionCard>

          {/* ── Statuses & Flags ───────────────────────────────────── */}
          <SectionCard icon={ClipboardList} title="Statuses & Flags">
            <TriStateToggle
              label="Auction Bill Paid"
              value={state.auctionBillPaid}
              onChange={(value) => setField("auctionBillPaid", value)}
            />
            <TriStateToggle
              label="Log Book"
              value={state.logBook}
              onChange={(value) => setField("logBook", value)}
            />
            <TriStateToggle
              label="Extra Key"
              value={state.extraKey}
              onChange={(value) => setField("extraKey", value)}
            />
            <DateField
              id="nameChangeDeadline"
              label="Name Change Deadline"
              value={state.nameChangeDeadline}
              onChange={(value) => setField("nameChangeDeadline", value)}
            />
            <div>
              <Label htmlFor="rowColourStatusId" className="mb-1.5">
                Row Colour Status
              </Label>
              <Select
                value={state.rowColourStatusId}
                onValueChange={(value) => setField("rowColourStatusId", value ?? "")}
              >
                <SelectTrigger id="rowColourStatusId" className="w-full">
                  <SelectValue placeholder="No status" />
                </SelectTrigger>
                <SelectContent>
                  {rowColourStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <span
                        className="mr-1.5 inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: status.colour }}
                      />
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateField
              id="docSentDate"
              label="Doc Sent to Client"
              value={state.docSentDate}
              onChange={(value) => setField("docSentDate", value)}
            />
            <TextField
              id="docSentComment"
              label="Doc Sent Comment"
              value={state.docSentComment}
              onChange={(value) => setField("docSentComment", value)}
              maxLength={500}
            />
            <DateField
              id="recycleDate"
              label="Recycle Date"
              value={state.recycleDate}
              onChange={(value) => setField("recycleDate", value)}
            />
            <div className="sm:col-span-2">
              <Label htmlFor="jibaishake" className="mb-1.5">
                Jibaishake (自賠責)
              </Label>
              <Textarea
                id="jibaishake"
                value={state.jibaishake}
                onChange={(event) => setField("jibaishake", event.target.value)}
                maxLength={500}
              />
            </div>
          </SectionCard>
        </div>

        {/* ── Right rail ─────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Track</span>
                <Badge variant="outline">{state.track}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Serial</span>
                <span className="font-mono">
                  {state.isLegacyEntry
                    ? state.legacySerialNumberText
                      ? `${state.track}${state.legacySerialNumberText}`
                      : "—"
                    : nextSerialPreview}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={SHIPMENT_STATUS_META[shipmentStatus].badgeVariant}>
                  {SHIPMENT_STATUS_META[shipmentStatus].label}
                </Badge>
              </div>
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Auction sheet, vehicle photos, documents and remarks become available once file
                storage is wired up — added in a follow-up task.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Vehicle
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/vehicles" />}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
