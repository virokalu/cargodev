// One bordered box per document type in a Documents panel (Add/Edit form,
// read-only detail page) — without this, stacking 8 upload widgets in one
// card with only a flat gap between them reads as one crammed block instead
// of 8 distinct sections.

export function DocumentTypeSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3">
      <h4 className="mb-2 text-sm font-semibold">{label}</h4>
      {children}
    </div>
  );
}
