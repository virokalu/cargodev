"use client";

// Add/Edit User dialog. One component handles both modes — `staff` present
// means edit, absent means create — following the same local-state-object +
// Server Action pattern as components/vehicles/add-vehicle-form.tsx.

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffRole } from "@prisma/client";
import { createStaffAction, updateStaffAction } from "@/app/(dashboard)/users/actions";

export interface StaffFormValues {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  active: boolean;
}

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "ADMINISTRATOR", label: "Administrator" },
  { value: "MANAGER", label: "Manager" },
  { value: "OPERATOR", label: "Operator" },
  { value: "VIEWER", label: "Viewer" },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  password: string;
}

const EMPTY_STATE: FormState = {
  name: "",
  email: "",
  phone: "",
  role: "OPERATOR",
  active: true,
  password: "",
};

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode; null/undefined = create mode. */
  staff?: StaffFormValues | null;
  onSaved: () => void;
}

// Dialog shell only — actual form state lives in UserFormBody, which is
// keyed by the target record so opening a different row (or Add User after
// an edit) remounts with fresh state instead of needing an effect to
// re-seed it (react-hooks/set-state-in-effect).
export function UserFormDialog({ open, onOpenChange, staff, onSaved }: UserFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <UserFormBody
            key={staff?.id ?? "create"}
            staff={staff}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UserFormBody({
  staff,
  onOpenChange,
  onSaved,
}: {
  staff?: StaffFormValues | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = !!staff;
  const [state, setState] = useState<FormState>(() =>
    staff
      ? {
          name: staff.name,
          email: staff.email,
          phone: staff.phone ?? "",
          role: staff.role,
          active: staff.active,
          password: "",
        }
      : EMPTY_STATE
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setBannerError(null);
    setFieldErrors({});

    const result = isEdit
      ? await updateStaffAction(staff!.id, {
          name: state.name,
          email: state.email,
          phone: state.phone,
          role: state.role,
          active: state.active,
          password: state.password || null,
        })
      : await createStaffAction({
          name: state.name,
          email: state.email,
          phone: state.phone,
          role: state.role,
          password: state.password,
        });

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setBannerError(result.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update this staff member's details and access."
            : "Create a new staff account with a role and initial password."}
        </DialogDescription>
      </DialogHeader>

      {bannerError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {bannerError}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="staff-name" className="mb-1.5">
              Name<span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff-name"
              value={state.name}
              onChange={(e) => setField("name", e.target.value)}
              aria-invalid={!!fieldErrors.name}
              className={fieldErrors.name ? "border-destructive" : undefined}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div>
            <Label htmlFor="staff-email" className="mb-1.5">
              Email<span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff-email"
              type="email"
              value={state.email}
              onChange={(e) => setField("email", e.target.value)}
              aria-invalid={!!fieldErrors.email}
              className={fieldErrors.email ? "border-destructive" : undefined}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
          </div>

          <div>
            <Label htmlFor="staff-phone" className="mb-1.5">
              Phone
            </Label>
            <Input
              id="staff-phone"
              value={state.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="staff-role" className="mb-1.5">
              Role<span className="text-destructive">*</span>
            </Label>
            <Select value={state.role} onValueChange={(v) => setField("role", v as StaffRole)}>
              <SelectTrigger id="staff-role" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.role && <p className="mt-1 text-xs text-destructive">{fieldErrors.role}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              Only administrators can assign or change roles.
            </p>
          </div>

          <div>
            <Label htmlFor="staff-password" className="mb-1.5">
              {isEdit ? "Reset Password" : "Password"}
              {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                value={state.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder={isEdit ? "Leave blank to keep current password" : "Minimum 8 characters"}
                aria-invalid={!!fieldErrors.password}
                className={fieldErrors.password ? "border-destructive pr-9" : "pr-9"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
            )}
            {!isEdit && (
              <p className="mt-1 text-xs text-muted-foreground">
                Share this password with the new staff member — they can change it from their
                profile later.
              </p>
            )}
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Account status</p>
                <p className="text-xs text-muted-foreground">Inactive staff can&apos;t sign in.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={state.active ? "success" : "secondary"}>
                  {state.active ? "Active" : "Inactive"}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setField("active", !state.active)}
                >
                  {state.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          )}
        </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Add User"}
        </Button>
      </DialogFooter>
    </>
  );
}
