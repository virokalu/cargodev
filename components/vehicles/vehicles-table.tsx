// The main vehicle table (US-06). No "use client" here — sorting and
// pagination are plain links that navigate to a new URL, which the server
// page re-reads to re-query; there's no server-page-level client state to
// manage. The one piece of genuine client interactivity — the status dot
// that appears in Actions once the row's status badge scrolls out of view —
// is scoped to VehicleTableScrollArea (status-scroll-context.tsx), not this
// component itself.
//
// Serial No / Chassis No / Model & Grade stay pinned on the left via
// `position: sticky` while everything else (the other ~28 fields) scrolls
// underneath horizontally — those are the three fields staff use to spot a
// vehicle at a glance, the rest is detail you scroll to when you need it.

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowColourStatusCell } from "@/components/vehicles/row-colour-status-cell";
import { AuctionBillPaidCell } from "@/components/vehicles/auction-bill-paid-cell";
import { DeleteVehicleDialog } from "@/components/vehicles/delete-vehicle-dialog";
import { VehicleTableScrollArea, StatusScrollDot } from "@/components/vehicles/status-scroll-context";
import { cn, formatDate } from "@/lib/utils";
import { buildVehiclesHref } from "@/lib/vehicle-list-url";
import { SHIPMENT_STATUS_META } from "@/lib/constants/shipment-status";
import type {
  VehicleListParams,
  VehicleListRow,
  VehicleListSortKey,
} from "@/lib/services/vehicle.service";

interface RowColourStatusOption {
  id: string;
  name: string;
  colour: string;
}

interface VehiclesTableProps {
  rows: VehicleListRow[];
  total: number;
  params: VehicleListParams;
  rowColourStatuses: RowColourStatusOption[];
  /** RBAC (US-02): Viewer gets read-only everywhere — no inline editors, no
   * Edit/Delete controls rendered, not just hidden behind a disabled state. */
  canWrite: boolean;
  canDelete: boolean;
}

// Pixel widths for the frozen columns — fixed (not "auto") so the sticky
// `left` offsets below are predictable regardless of cell content.
const FROZEN_WIDTH = { serial: 116, chassis: 150, model: 220, actions: 84 };
const FROZEN_LEFT = {
  serial: 0,
  chassis: FROZEN_WIDTH.serial,
  model: FROZEN_WIDTH.serial + FROZEN_WIDTH.chassis,
  actions: FROZEN_WIDTH.serial + FROZEN_WIDTH.chassis + FROZEN_WIDTH.model,
};

function frozenStyle(left: number, width: number, rowBg: string | undefined): React.CSSProperties {
  return { position: "sticky", left, width, minWidth: width, zIndex: 1, backgroundColor: rowBg };
}

function SortableHeader({
  label,
  sortKey,
  params,
}: {
  label: string;
  sortKey: VehicleListSortKey;
  params: VehicleListParams;
}) {
  const isActive = params.sortBy === sortKey;
  const nextDir = isActive && params.sortDir === "asc" ? "desc" : "asc";
  const href = buildVehiclesHref(params, { sortBy: sortKey, sortDir: nextDir, page: 1 });
  const Icon = isActive ? (params.sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <Link href={href} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      <Icon className={cn("size-3.5", isActive ? "text-foreground" : "text-muted-foreground/50")} />
    </Link>
  );
}

function TriStateCell({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={value ? "success" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
}

function RowColourCell({ status }: { status: VehicleListRow["rowColourStatus"] }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: status.colour }}
      />
      {status.name}
    </span>
  );
}

interface ColumnContext {
  canWrite: boolean;
  rowColourStatuses: RowColourStatusOption[];
}

// Transport By is a normal (non-frozen) column, but it's the one field that
// gets coloured on its own even when the rest of the row isn't (US-09:
// "Transport Complete" colours only this cell, never the whole row) — the
// one column below that needs a per-cell background, via `cellStyle`.
function transportByStyle(row: VehicleListRow): React.CSSProperties | undefined {
  if (row.rowColourStatus?.transportCellOnly) {
    return { backgroundColor: row.rowColourStatus.colour };
  }
  return undefined;
}

// The non-frozen columns, in the order requested (2026-07-25) — matches
// FTJ MAIN.pdf's physical sheet order, with Shipment Status (not on that
// sheet) kept right after Model/Grade, Row Colour Status at the very end,
// "SHIPMENT DATE" mapped to ETD (ETA dropped — not on the sheet either),
// and "REMARKS" split out of what was one Doc Sent to Client cell into its
// own column next to it, rather than the unbuilt RemarkEntry feature.
//
// Auction Item No is NOT a column here — turned out to be a duplicate of
// Auction Lot No (Tech Doc §2), added by mistake. Hidden rather than
// dropped from the schema: no DB change, it's just not queried into
// VehicleListRow or rendered anywhere.
const SCROLL_COLUMNS: {
  key: string;
  header: string;
  sortKey?: VehicleListSortKey;
  render: (row: VehicleListRow, ctx: ColumnContext) => React.ReactNode;
  cellStyle?: (row: VehicleListRow) => React.CSSProperties | undefined;
  /** Centers both the header label and the cell content — used for the
   * tri-state columns, whose Yes/No/— values read oddly left-aligned. */
  center?: boolean;
}[] = [
  {
    key: "shipmentStatus",
    header: "Shipment Status",
    sortKey: "shipmentStatus",
    render: (row) => (
      <Badge variant={SHIPMENT_STATUS_META[row.effectiveShipmentStatus].badgeVariant}>
        {SHIPMENT_STATUS_META[row.effectiveShipmentStatus].label}
      </Badge>
    ),
  },
  { key: "auctionHall", header: "Auction Hall", render: (row) => row.auctionHallName ?? "—" },
  {
    key: "purchaseDate",
    header: "Purchase Date",
    sortKey: "purchaseDate",
    render: (row) => formatDate(row.purchaseDate),
  },
  { key: "auctionLotNo", header: "Auction Lot No", render: (row) => row.auctionLotNo ?? "—" },
  { key: "customer", header: "Customer", render: (row) => row.customerName ?? "—" },
  {
    key: "destination",
    header: "Destination",
    sortKey: "destination",
    render: (row) => row.destination ?? "—",
  },
  {
    key: "auctionBillPaid",
    header: "Auction Bill Paid",
    center: true,
    render: (row, ctx) =>
      ctx.canWrite ? (
        <AuctionBillPaidCell vehicleId={row.id} value={row.auctionBillPaid} />
      ) : (
        <TriStateCell value={row.auctionBillPaid} />
      ),
  },
  {
    key: "docsArrivedDate",
    header: "Docs Arrived Date",
    sortKey: "docsArrivedDate",
    render: (row) => formatDate(row.docsArrivedDate),
  },
  {
    key: "logBook",
    header: "Log Book",
    center: true,
    render: (row) => <TriStateCell value={row.logBook} />,
  },
  {
    key: "extraKey",
    header: "Extra Key",
    center: true,
    render: (row) => <TriStateCell value={row.extraKey} />,
  },
  {
    key: "nameChangeDeadline",
    header: "Name Change Deadline",
    sortKey: "nameChangeDeadline",
    render: (row) => formatDate(row.nameChangeDeadline),
  },
  {
    key: "transportBy",
    header: "Transport By",
    render: (row) => row.transportByName ?? "—",
    cellStyle: transportByStyle,
  },
  { key: "vehicleLocation", header: "Vehicle Location", render: (row) => row.vehicleLocationName ?? "—" },
  { key: "freightAgent", header: "Freight Agent", render: (row) => row.freightAgentName ?? "—" },
  {
    key: "shippingMethod",
    header: "RORO / Container",
    render: (row) =>
      row.shippingMethod === "RORO" ? "RORO" : row.shippingMethod === "CONTAINER" ? "Container" : "—",
  },
  { key: "massoDate", header: "Masso Date", sortKey: "massoDate", render: (row) => formatDate(row.massoDate) },
  { key: "etd", header: "ETD", sortKey: "etd", render: (row) => formatDate(row.etd) },
  { key: "blNo", header: "BL No", render: (row) => row.blNo ?? "—" },
  { key: "lcNo", header: "LC No", render: (row) => row.lcNo ?? "—" },
  { key: "trackingNo", header: "Tracking No", render: (row) => row.trackingNo ?? "—" },
  {
    key: "remarks",
    header: "Remarks",
    render: (row) =>
      row.docSentComment ? (
        <span className="block max-w-40 truncate" title={row.docSentComment}>
          {row.docSentComment}
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "docSentDate",
    header: "Doc Sent to Client",
    sortKey: "docSentDate",
    render: (row) => formatDate(row.docSentDate),
  },
  { key: "recycleDate", header: "Recycle Date", sortKey: "recycleDate", render: (row) => formatDate(row.recycleDate) },
  {
    key: "jibaishake",
    header: "Jibaishake",
    render: (row) =>
      row.jibaishake ? (
        <span className="block max-w-32 truncate" title={row.jibaishake}>
          {row.jibaishake}
        </span>
      ) : (
        "—"
      ),
  },
  { key: "billNumber", header: "Bill Number", render: (row) => row.billNumber ?? "—" },
  {
    key: "rowColourStatus",
    header: "Row Colour Status",
    render: (row, ctx) =>
      ctx.canWrite ? (
        <RowColourStatusCell
          vehicleId={row.id}
          value={row.rowColourStatus?.id ?? null}
          options={ctx.rowColourStatuses}
        />
      ) : (
        <RowColourCell status={row.rowColourStatus} />
      ),
  },
];

export function VehiclesTable({
  rows,
  total,
  params,
  rowColourStatuses,
  canWrite,
  canDelete,
}: VehiclesTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const totalCols = 4 + SCROLL_COLUMNS.length; // frozen (incl. Actions) + scrolling
  const columnContext: ColumnContext = { canWrite, rowColourStatuses };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <VehicleTableScrollArea>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead
                style={frozenStyle(FROZEN_LEFT.serial, FROZEN_WIDTH.serial, undefined)}
                className="bg-muted font-semibold"
              >
                <SortableHeader label="Serial No" sortKey="serial" params={params} />
              </TableHead>
              <TableHead
                style={frozenStyle(FROZEN_LEFT.chassis, FROZEN_WIDTH.chassis, undefined)}
                className="bg-muted font-semibold"
              >
                <SortableHeader label="Chassis No" sortKey="chassisNo" params={params} />
              </TableHead>
              <TableHead
                style={frozenStyle(FROZEN_LEFT.model, FROZEN_WIDTH.model, undefined)}
                className="bg-muted font-semibold"
              >
                <SortableHeader label="Model / Grade" sortKey="model" params={params} />
              </TableHead>
              <TableHead
                style={frozenStyle(FROZEN_LEFT.actions, FROZEN_WIDTH.actions, undefined)}
                className="border-r bg-muted font-semibold"
              >
                Actions
              </TableHead>
              {SCROLL_COLUMNS.map((column, i) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "font-semibold",
                    column.center && "text-center",
                    i < SCROLL_COLUMNS.length - 1 && "border-r"
                  )}
                >
                  {column.sortKey ? (
                    <SortableHeader label={column.header} sortKey={column.sortKey} params={params} />
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalCols} className="h-24 text-center text-muted-foreground">
                  No vehicles match your search and filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const rowBg =
                  row.rowColourStatus && !row.rowColourStatus.transportCellOnly
                    ? row.rowColourStatus.colour
                    : undefined;

                return (
                  <TableRow key={row.id} style={{ backgroundColor: rowBg }}>
                    <TableCell
                      style={frozenStyle(FROZEN_LEFT.serial, FROZEN_WIDTH.serial, rowBg)}
                      className={cn("truncate font-mono font-medium", !rowBg && "bg-card")}
                    >
                      {row.serial}
                    </TableCell>
                    <TableCell
                      style={frozenStyle(FROZEN_LEFT.chassis, FROZEN_WIDTH.chassis, rowBg)}
                      className={cn("truncate font-mono text-xs", !rowBg && "bg-card")}
                    >
                      {row.chassisNo ?? "—"}
                    </TableCell>
                    <TableCell
                      style={frozenStyle(FROZEN_LEFT.model, FROZEN_WIDTH.model, rowBg)}
                      className={cn("whitespace-normal", !rowBg && "bg-card")}
                    >
                      {row.brandName || row.modelName ? (
                        <>
                          <div className="font-medium">
                            {[row.brandName, row.modelName].filter(Boolean).join(" ")}
                          </div>
                          {(row.gradeName || row.yom) && (
                            <div className="text-xs text-muted-foreground">
                              {[row.gradeName, row.yom].filter(Boolean).join(" - ")}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      style={frozenStyle(FROZEN_LEFT.actions, FROZEN_WIDTH.actions, rowBg)}
                      className={cn("border-r", !rowBg && "bg-card")}
                    >
                      <div className="flex items-center gap-1.5">
                        <StatusScrollDot status={row.effectiveShipmentStatus} />
                        {canWrite || canDelete ? (
                          <div className="flex items-center gap-1">
                            {canWrite && (
                              <Link
                                href={`/vehicles/${row.id}/edit`}
                                aria-label={`Edit ${row.serial}`}
                                className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                              >
                                <Pencil className="size-4" />
                              </Link>
                            )}
                            {canDelete && <DeleteVehicleDialog vehicleId={row.id} serial={row.serial} />}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    {SCROLL_COLUMNS.map((column, i) => (
                      <TableCell
                        key={column.key}
                        className={cn(column.center && "text-center", i < SCROLL_COLUMNS.length - 1 && "border-r")}
                        style={column.cellStyle?.(row)}
                      >
                        {column.render(row, columnContext)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </VehicleTableScrollArea>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {params.page} of {totalPages} · {total} vehicle{total === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <Link
            href={buildVehiclesHref(params, { page: Math.max(1, params.page - 1) })}
            aria-disabled={params.page <= 1}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted",
              params.page <= 1 && "pointer-events-none opacity-50"
            )}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Link>
          <Link
            href={buildVehiclesHref(params, { page: Math.min(totalPages, params.page + 1) })}
            aria-disabled={params.page >= totalPages}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted",
              params.page >= totalPages && "pointer-events-none opacity-50"
            )}
          >
            Next
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
