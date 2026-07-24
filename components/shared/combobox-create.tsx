"use client";

// Combobox-with-inline-create (Tech Doc §4 / design-system.md §6.2). Search
// results come from a Server Action passed in as `search`; picking "Add '…'"
// calls `onCreate`, also a Server Action. This component never talks to
// Prisma directly — it only ever goes through lookup.service via the actions
// passed in, so every value it creates is deduped case-insensitively there
// (CLAUDE.md rule 8: lookups are created only through lookup services).

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Pencil, Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  id: string;
  name: string;
}

interface ComboboxCreateProps {
  id: string;
  label: string;
  /** What "Add '{query}' as new …" calls this thing, e.g. "brand", "auction hall". */
  createLabel: string;
  value: ComboboxOption | null;
  onChange: (value: ComboboxOption | null) => void;
  search: (query: string) => Promise<ComboboxOption[]>;
  onCreate: (name: string) => Promise<ComboboxOption>;
  /** Renaming is a separate permission from creating (CLAUDE.md rule 8 still
   * applies — this goes through lookup.service, never a direct prisma call).
   * Omit to leave options read-only aside from selecting/creating them. */
  onRename?: (option: ComboboxOption, newName: string) => Promise<ComboboxOption>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  error?: string;
}

const DEBOUNCE_MS = 250;

export function ComboboxCreate({
  id,
  label,
  createLabel,
  value,
  onChange,
  search,
  onCreate,
  onRename,
  placeholder = "Search…",
  required,
  disabled,
  disabledHint,
  error,
}: ComboboxCreateProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const thisRequest = ++requestId.current;
    // setLoading(true) is deferred into the timeout callback (not called
    // synchronously here) so this effect only ever subscribes to an external
    // timer instead of updating state directly during its own run.
    const timeout = setTimeout(() => {
      setLoading(true);
      search(query).then((results) => {
        if (requestId.current === thisRequest) {
          setOptions(results);
          setLoading(false);
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const trimmedQuery = query.trim();
  const hasExactMatch = options.some(
    (option) => option.name.toLowerCase() === trimmedQuery.toLowerCase()
  );

  async function handleCreate() {
    setCreating(true);
    try {
      const created = await onCreate(trimmedQuery);
      onChange(created);
      setOpen(false);
      setQuery("");
    } finally {
      setCreating(false);
    }
  }

  function startEditing(option: ComboboxOption) {
    setEditingId(option.id);
    setEditingName(option.name);
  }

  async function handleSaveRename(option: ComboboxOption) {
    const trimmed = editingName.trim();
    if (!onRename || !trimmed) return;
    setRenaming(true);
    try {
      const updated = await onRename(option, trimmed);
      setOptions((previous) => previous.map((o) => (o.id === option.id ? updated : o)));
      // The renamed option might be the one currently selected on the form —
      // keep it in sync so the trigger shows the new name immediately.
      if (value?.id === option.id) {
        onChange(updated);
      }
      setEditingId(null);
    } finally {
      setRenaming(false);
    }
  }

  function handleSelect(option: ComboboxOption) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-full justify-between px-2.5 font-normal",
            !value && "text-muted-foreground",
            error && "border-destructive"
          )}
        >
          <span className="truncate">{value?.name ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={`Search ${createLabel}…`}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </div>
              )}
              {!loading && options.length === 0 && !trimmedQuery && (
                <CommandEmpty>Type to search {createLabel}s…</CommandEmpty>
              )}
              {!loading && (
                <CommandGroup>
                  {options.map((option) =>
                    editingId === option.id ? (
                      <div key={option.id} className="flex items-center gap-1 px-2 py-1">
                        <Input
                          autoFocus
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          disabled={renaming}
                          className="h-7 flex-1 text-sm"
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleSaveRename(option);
                            if (event.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button
                          type="button"
                          disabled={renaming}
                          onClick={() => handleSaveRename(option)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                          aria-label={`Save new name for ${option.name}`}
                        >
                          {renaming ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={renaming}
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                          aria-label="Cancel rename"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <CommandItem key={option.id} value={option.id} onSelect={() => handleSelect(option)}>
                        <Check
                          className={cn(
                            "size-4",
                            value?.id === option.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1 truncate">{option.name}</span>
                        {onRename && (
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Rename ${option.name}`}
                            className="rounded p-1 opacity-0 hover:bg-muted group-hover/command-item:opacity-100"
                            onMouseDown={(event) => {
                              // Stop cmdk's own pointer handling so this click
                              // opens the rename row instead of selecting the item.
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              startEditing(option);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                startEditing(option);
                              }
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </span>
                        )}
                      </CommandItem>
                    )
                  )}
                  {trimmedQuery && !hasExactMatch && (
                    <CommandItem
                      value={`__create__${trimmedQuery}`}
                      disabled={creating}
                      onSelect={handleCreate}
                    >
                      {creating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      Add &quot;{trimmedQuery}&quot; as new {createLabel}
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {disabled && disabledHint && <p className="mt-1 text-xs text-muted-foreground">{disabledHint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
