// The main vehicle table (US-06). No "use client" here — sorting and
// pagination are plain links that navigate to a new URL, which the server
// page re-reads to re-query; there's no server-page-level client state to
// manage. The one piece of genuine client interactivity — the status dot
// that appears in Actions once the row's status badge scrolls out of view —
// is scoped to status-scroll-context.tsx, not this component itself.
//
// Renders as two side-by-side <table>s, each scrolling horizontally on its
// own: an identity pane (Serial No / Chassis No / Model & Grade / Actions —
// the fields staff use to spot a vehicle at a glance) at its full desktop
// size always, and a detail pane (the other ~28 fields). They don't scroll
// together — on a narrow screen you scroll each pane separately to see the
// rest of its own columns. See IDENTITY_PANE_WIDTH / ROW_HEIGHT_CLASS below
// for why.

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowColourStatusCell } from "@/components/vehicles/row-colour-status-cell";
import { TriStateCell } from "@/components/shared/tri-state-cell";
import { RowColourCell } from "@/components/shared/row-colour-cell";
import { AuctionBillPaidCell } from "@/components/vehicles/auction-bill-paid-cell";
import { DeleteVehicleDialog } from "@/components/vehicles/delete-vehicle-dialog";
import { StatusScrollProvider, DetailPaneTable, StatusScrollDot } from "@/components/vehicles/status-scroll-context";
import { ClickableRow } from "@/components/vehicles/clickable-row";
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
   * Edit/Delete controls rendered, not just hidden behind a disabled state.
   * `canWrite` covers the inline Row Colour Status editor (Admin/Manager/
   * Operator — "table level" access); `canEditVehicle` covers the full
   * edit-form link (Admin/Manager only — Operator doesn't get this one). */
  canWrite: boolean;
  canEditVehicle: boolean;
  canDelete: boolean;
}

// Serial No / Chassis No / Model & Grade / Actions are the fields staff use
// to spot a vehicle at a glance, so they need to stay visible at all times —
// but at their full desktop widths (116/150/220/84px, 570px combined) they
// alone are wider than a phone screen. Rather than shrink their font/content
// to fit (tried first — cells got too cramped to read), this renders them as
// their own separate <table> in a fixed-width pane that scrolls
// *independently* of the ~28 detail columns' pane next to it: two side-by-side
// scroll regions instead of one table with squeezed sticky columns. Content
// keeps its original size everywhere; on a narrow screen you scroll the left
// pane to see all four columns, and scroll the right pane separately to see
// the rest — they don't move together, by design (that's what makes this
// different from a single table with `position: sticky` columns, which was
// the previous, rejected approach). The pane's sm:w-[570px] below (116 + 150
// + 220 + 84) has to be a literal class string, not built from a shared
// constant — Tailwind only picks up arbitrary-value classes it can find as
// static text.

// Two independent <table> elements can't share row heights automatically —
// each sizes its own rows from its own content. The detail columns are all
// single-line (TableCell's default whitespace-nowrap), and the identity
// pane's only multi-line cell is Model/Grade (up to 2 lines) — pinning body
// rows in *both* tables to the same explicit height keeps every row lined up
// across the two panes. Value is a bit taller than a 2-line Model cell needs
// (text-sm + text-xs stacked, plus TableCell's p-2) so it's never the one
// constraining content; confirmed by measuring rendered row rects.
const ROW_HEIGHT_CLASS = "h-[52px]";

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
// and "Doc Sent Remark" split out of what was one Doc Sent to Client cell
// into its own column next to it. Vehicle Remark is a separate plain-text
// field on the vehicle (not the old append-only RemarkEntry thread), shown
// as its own column next to Jibaishake.
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
  { key: "freightAgent", header: "Forwarding Agent", render: (row) => row.freightAgentName ?? "—" },
  {
    key: "shippingMethod",
    header: "RORO / Container",
    render: (row) =>
      row.shippingMethod === "RORO" ? "RORO" : row.shippingMethod === "CONTAINER" ? "Container" : "—",
  },
  { key: "packingAgent", header: "Packing Agent", render: (row) => row.packingAgentName ?? "—" },
  { key: "massoDate", header: "Masso Date", sortKey: "massoDate", render: (row) => formatDate(row.massoDate) },
  { key: "etd", header: "ETD", sortKey: "etd", render: (row) => formatDate(row.etd) },
  { key: "blNo", header: "BL No", render: (row) => row.blNo ?? "—" },
  { key: "lcNo", header: "LC No", render: (row) => row.lcNo ?? "—" },
  { key: "trackingNo", header: "Tracking No", render: (row) => row.trackingNo ?? "—" },
  {
    key: "docSentComment",
    header: "Doc Sent Remark",
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
  {
    key: "vehicleRemark",
    header: "Vehicle Remark",
    render: (row) =>
      row.vehicleRemark ? (
        <span className="block max-w-40 truncate" title={row.vehicleRemark}>
          {row.vehicleRemark}
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
  canEditVehicle,
  canDelete,
}: VehiclesTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const columnContext: ColumnContext = { canWrite, rowColourStatuses };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border text-muted-foreground">
          No vehicles match your search and filters.
        </div>
      ) : (
        <StatusScrollProvider>
          <div className="flex overflow-hidden rounded-lg border">
            {/* Identity pane — Serial No / Chassis No / Model & Grade / Actions,
                full desktop size always, its own independent horizontal scroll. */}
            <div className="w-[50vw] shrink-0 border-r sm:w-[570px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="w-[116px] min-w-[116px] bg-muted font-semibold">
                      <SortableHeader label="Serial No" sortKey="serial" params={params} />
                    </TableHead>
                    <TableHead className="w-[150px] min-w-[150px] bg-muted font-semibold">
                      <SortableHeader label="Chassis No" sortKey="chassisNo" params={params} />
                    </TableHead>
                    <TableHead className="w-[220px] min-w-[220px] bg-muted font-semibold">
                      <SortableHeader label="Model / Grade" sortKey="model" params={params} />
                    </TableHead>
                    <TableHead className="w-[84px] min-w-[84px] bg-muted font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const rowBg =
                      row.rowColourStatus && !row.rowColourStatus.transportCellOnly
                        ? row.rowColourStatus.colour
                        : undefined;

                    return (
                      <ClickableRow
                        key={row.id}
                        href={`/vehicles/${row.id}`}
                        className={ROW_HEIGHT_CLASS}
                        style={{ backgroundColor: rowBg }}
                      >
                        <TableCell
                          style={{ backgroundColor: rowBg }}
                          className={cn("font-mono font-medium", !rowBg && "bg-card")}
                        >
                          {row.serial}
                        </TableCell>
                        <TableCell
                          style={{ backgroundColor: rowBg }}
                          className={cn("font-mono text-xs", !rowBg && "bg-card")}
                        >
                          {row.chassisNo ?? "—"}
                        </TableCell>
                        <TableCell style={{ backgroundColor: rowBg }} className={cn(!rowBg && "bg-card")}>
                          {row.brandName || row.modelName ? (
                            <>
                              {/* max-w-[206px] = the 220px column minus TableCell's own p-2
                                  (14px at this app's 14px root) — width/min-width on the
                                  <th> above is only an auto-layout *hint*, so truncate's
                                  overflow:hidden needs a real width on the element itself
                                  to actually have something to clip against. */}
                              <div
                                className="max-w-[206px] truncate font-medium"
                                title={[row.brandName, row.modelName].filter(Boolean).join(" ")}
                              >
                                {[row.brandName, row.modelName].filter(Boolean).join(" ")}
                              </div>
                              {(row.gradeName || row.yom) && (
                                <div
                                  className="max-w-[206px] truncate text-xs text-muted-foreground"
                                  title={[row.gradeName, row.yom].filter(Boolean).join(" - ")}
                                >
                                  {[row.gradeName, row.yom].filter(Boolean).join(" - ")}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell style={{ backgroundColor: rowBg }} className={cn(!rowBg && "bg-card")}>
                          <div className="flex items-center gap-1.5">
                            <StatusScrollDot status={row.effectiveShipmentStatus} />
                            {canEditVehicle || canDelete ? (
                              <div className="flex items-center gap-1">
                                {canEditVehicle && (
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
                      </ClickableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Detail pane — the ~28 remaining columns, its own independent
                horizontal scroll (separate from the identity pane above). */}
            <div className="min-w-0 flex-1">
              <DetailPaneTable>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
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
                  {rows.map((row) => {
                    const rowBg =
                      row.rowColourStatus && !row.rowColourStatus.transportCellOnly
                        ? row.rowColourStatus.colour
                        : undefined;

                    return (
                      <ClickableRow
                        key={row.id}
                        href={`/vehicles/${row.id}`}
                        className={ROW_HEIGHT_CLASS}
                        style={{ backgroundColor: rowBg }}
                      >
                        {SCROLL_COLUMNS.map((column, i) => (
                          <TableCell
                            key={column.key}
                            className={cn(column.center && "text-center", i < SCROLL_COLUMNS.length - 1 && "border-r")}
                            style={column.cellStyle?.(row)}
                          >
                            {column.render(row, columnContext)}
                          </TableCell>
                        ))}
                      </ClickableRow>
                    );
                  })}
                </TableBody>
              </DetailPaneTable>
            </div>
          </div>
        </StatusScrollProvider>
      )}

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
