// Read-only display for a Row Colour Status — a coloured dot plus its name.
// Used wherever the status is shown but not edited: the vehicles table
// (when the viewer can't write) and the vehicle detail page. The editable
// version is RowColourStatusCell (components/vehicles/) — this is
// display-only.

export function RowColourCell({ status }: { status: { name: string; colour: string } | null }) {
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
