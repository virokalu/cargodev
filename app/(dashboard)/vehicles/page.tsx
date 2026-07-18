// app/vehicles/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { vehicles, SHIPMENT_STATUSES, type VehicleStatus } from "@/lib/mock-data";

const PAGE_SIZE = 10;

const statusBadgeVariant: Record<
  VehicleStatus,
  "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline"
> = {
  Pending: "warning",
  Shipped: "info",
  "In Transit": "default",
  Arrived: "success",
  Delayed: "destructive",
  "Customs Hold": "destructive",
};

export default function VehiclesPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchesQuery =
        !q ||
        v.id.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.chassisNumber.toLowerCase().includes(q) ||
        v.destination.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || v.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">
            {filtered.length} vehicle{filtered.length === 1 ? "" : "s"} in your fleet.
          </p>
        </div>
        <Link href="/vehicles/add">
          <Button>
            <Plus className="mr-2 size-4" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by chassis #, make, model, or destination..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as VehicleStatus | "all");
            resetPage();
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {SHIPMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Chassis #</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shipment Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No vehicles match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium">
                      {v.year} {v.make} {v.model}
                    </div>
                    <div className="text-xs text-muted-foreground">{v.id}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.chassisNumber}</TableCell>
                  <TableCell>
                    <div>{v.destination}</div>
                    <div className="text-xs text-muted-foreground">{v.destinationCountry}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[v.status]}>{v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(v.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    {/* <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/vehicles/${v.id}`}>
                            <Eye className="mr-2 size-4" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/vehicles/${v.id}/edit`}>
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu> */}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}