"use client";

// Users (staff) screen — CD-D2-17. Layout matches the approved design
// (title + subtitle + Add User button on one row, search below, table in a
// card) with the avatar-initial + role-pill table recipe from
// docs/design-system.md §6.5/§6.3.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Power, PowerOff, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { RoleBadge } from "@/components/shared/role-badge";
import { UserFormDialog, type StaffFormValues } from "@/components/users/user-form-dialog";
import { setStaffActiveAction } from "@/app/(dashboard)/users/actions";
import type { StaffListItem } from "@/lib/services/user.service";

/** Derive up to 2 uppercase initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UsersTableProps {
  staff: StaffListItem[];
  currentUserId: string;
}

export function UsersTable({ staff, currentUserId }: UsersTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffFormValues | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (member) =>
        member.name.toLowerCase().includes(q) || (member.email ?? "").toLowerCase().includes(q)
    );
  }, [staff, query]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(member: StaffListItem) {
    setEditing({
      id: member.id,
      name: member.name,
      email: member.email ?? "",
      phone: member.phone,
      role: member.role,
      active: member.loginEnabled,
    });
    setDialogOpen(true);
  }

  async function handleToggleActive(member: StaffListItem) {
    setPendingToggleId(member.id);
    await setStaffActiveAction(member.id, !member.loginEnabled);
    setPendingToggleId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            {staff.length} team member{staff.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 size-4" />
          Add User
        </Button>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No team members match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow key={member.id} className={!member.loginEnabled ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-3 py-1">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{member.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      {!member.loginEnabled && (
                        <Badge variant="outline" className="ml-1 shrink-0">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${member.name}`}
                        onClick={() => openEdit(member)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          member.loginEnabled ? `Deactivate ${member.name}` : `Activate ${member.name}`
                        }
                        title={
                          member.id === currentUserId
                            ? "You can't deactivate your own account"
                            : undefined
                        }
                        disabled={member.id === currentUserId || pendingToggleId === member.id}
                        onClick={() => handleToggleActive(member)}
                      >
                        {member.loginEnabled ? (
                          <Power className="size-4" />
                        ) : (
                          <PowerOff className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        staff={editing}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
