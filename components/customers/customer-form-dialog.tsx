"use client";

// Add/Edit Customer dialog. Name is the only required field (Tech Doc §5,
// US-27 "name-first customer") — everything else can be filled in later.

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { CountrySelect } from "@/components/shared/country-select";
import { Textarea } from "@/components/ui/textarea";
import type { CountryOption } from "@/lib/constants/countries";
import {
  createCustomerFullAction,
  updateCustomerAction,
} from "@/app/(dashboard)/customers/actions";

export interface CustomerFormValues {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  country: string;
  address: string;
}

const EMPTY_STATE: FormState = {
  name: "",
  email: "",
  phone: "",
  country: "",
  address: "",
};

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode; null/undefined = create mode. */
  customer?: CustomerFormValues | null;
  countries: CountryOption[];
  onSaved: () => void;
}

// Dialog shell only — actual form state lives in CustomerFormBody, which is
// keyed by the target record so opening a different row (or Add Customer
// after an edit) remounts with fresh state instead of needing an effect to
// re-seed it (react-hooks/set-state-in-effect).
export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  countries,
  onSaved,
}: CustomerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <CustomerFormBody
            key={customer?.id ?? "create"}
            customer={customer}
            countries={countries}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomerFormBody({
  customer,
  countries,
  onOpenChange,
  onSaved,
}: {
  customer?: CustomerFormValues | null;
  countries: CountryOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = !!customer;
  const [state, setState] = useState<FormState>(() =>
    customer
      ? {
          name: customer.name,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          country: customer.country ?? "",
          address: customer.address ?? "",
        }
      : EMPTY_STATE
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setBannerError(null);
    setFieldErrors({});

    const payload = {
      name: state.name,
      email: state.email,
      phone: state.phone,
      country: state.country,
      address: state.address,
    };

    const result = isEdit
      ? await updateCustomerAction(customer!.id, payload)
      : await createCustomerFullAction(payload);

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
        <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update this customer's contact details."
            : "Name is the only required field — the rest can be filled in later."}
        </DialogDescription>
      </DialogHeader>

      {bannerError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {bannerError}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="customer-name" className="mb-1.5">
            Name<span className="text-destructive">*</span>
          </Label>
          <Input
            id="customer-name"
            value={state.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={!!fieldErrors.name}
            className={fieldErrors.name ? "border-destructive" : undefined}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div>
          <Label htmlFor="customer-email" className="mb-1.5">
            Email
          </Label>
          <Input
            id="customer-email"
            type="email"
            value={state.email}
            onChange={(e) => setField("email", e.target.value)}
            aria-invalid={!!fieldErrors.email}
            className={fieldErrors.email ? "border-destructive" : undefined}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
        </div>

        <div>
          <Label htmlFor="customer-phone" className="mb-1.5">
            Phone
          </Label>
          <Input
            id="customer-phone"
            value={state.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </div>

        <CountrySelect
          id="customer-country"
          label="Country"
          options={countries}
          value={state.country}
          onChange={(name) => setField("country", name)}
        />

        <div>
          <Label htmlFor="customer-address" className="mb-1.5">
            Address
          </Label>
          <Textarea
            id="customer-address"
            value={state.address}
            onChange={(e) => setField("address", e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Add Customer"}
        </Button>
      </DialogFooter>
    </>
  );
}
