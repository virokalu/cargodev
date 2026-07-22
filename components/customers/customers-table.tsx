"use client";

// Customers screen — CD-D2-15. Same table recipe as Users, but a separate
// screen and a separate underlying filter (userType = CUSTOMER) per Tech Doc
// §5 / US-29 ("customers and employees on separate screens ... even though
// they share one accounts table").

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CustomerFormDialog,
  type CustomerFormValues,
} from "@/components/customers/customer-form-dialog";
import type { CustomerListItem } from "@/lib/services/customer.service";
import type { CountryOption } from "@/lib/constants/countries";

/** Derive up to 2 uppercase initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface CustomersTableProps {
  customers: CustomerListItem[];
  countries: CountryOption[];
  /** Manager and above manage customers (US-02); Operator/Viewer see read-only. */
  canManage: boolean;
}

export function CustomersTable({ customers, countries, canManage }: CustomersTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerFormValues | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(customer: CustomerListItem) {
    setEditing({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      country: customer.country,
      address: customer.address,
    });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            {customers.length} customer{customers.length === 1 ? "" : "s"}.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            Add Customer
          </Button>
        )}
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Vehicles</TableHead>
              {canManage && <TableHead className="w-16 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center text-muted-foreground">
                  No customers match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3 py-1">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold text-foreground">{customer.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {customer.email && <p className="text-foreground">{customer.email}</p>}
                      {customer.phone && <p className="text-muted-foreground">{customer.phone}</p>}
                      {!customer.email && !customer.phone && (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.country ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.vehicleCount}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${customer.name}`}
                        onClick={() => openEdit(customer)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canManage && (
        <CustomerFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          customer={editing}
          countries={countries}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
