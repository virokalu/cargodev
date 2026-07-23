"use client";

// Freight Agent combobox — same inline search/create/rename pattern as
// ComboboxCreate (components/shared/combobox-create.tsx), but a freight
// agent also carries offersRoro/offersContainer capability flags that gate
// which shipping method can later be picked for it (lib/services/lookup
// .service.ts). Those flags have no sane default, so both the create and
// edit rows ask for them explicitly instead of defaulting blind — a plain
// ComboboxOption can't carry that extra state, hence a dedicated component
// rather than reusing ComboboxCreate generically.

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
import type { FreightAgentOption } from "@/lib/services/lookup.service";

interface FreightAgentComboboxProps {
  id: string;
  label: string;
  value: FreightAgentOption | null;
  onChange: (value: FreightAgentOption | null) => void;
  search: (query: string) => Promise<FreightAgentOption[]>;
  onCreate: (name: string, offersRoro: boolean, offersContainer: boolean) => Promise<FreightAgentOption>;
  onUpdate: (
    option: FreightAgentOption,
    name: string,
    offersRoro: boolean,
    offersContainer: boolean
  ) => Promise<FreightAgentOption>;
  placeholder?: string;
  error?: string;
}

const DEBOUNCE_MS = 250;

function CapabilityToggles({
  offersRoro,
  offersContainer,
  onToggleRoro,
  onToggleContainer,
}: {
  offersRoro: boolean;
  offersContainer: boolean;
  onToggleRoro: () => void;
  onToggleContainer: () => void;
}) {
  return (
    <div className="flex gap-1.5">
      {(
        [
          { label: "RORO", active: offersRoro, onClick: onToggleRoro },
          { label: "Container", active: offersContainer, onClick: onToggleContainer },
        ] as const
      ).map((capability) => (
        <button
          key={capability.label}
          type="button"
          onClick={capability.onClick}
          className={cn(
            "rounded-sm border px-2 py-1 text-xs font-semibold transition-colors",
            capability.active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={capability.active}
        >
          {capability.label}
        </button>
      ))}
    </div>
  );
}

export function FreightAgentCombobox({
  id,
  label,
  value,
  onChange,
  search,
  onCreate,
  onUpdate,
  placeholder = "Select agent",
  error,
}: FreightAgentComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<FreightAgentOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [drafting, setDrafting] = useState(false);
  const [draftRoro, setDraftRoro] = useState(false);
  const [draftContainer, setDraftContainer] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingRoro, setEditingRoro] = useState(false);
  const [editingContainer, setEditingContainer] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const thisRequest = ++requestId.current;
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

  function startDraft() {
    setDrafting(true);
    setDraftRoro(false);
    setDraftContainer(false);
  }

  async function handleCreate() {
    if (!draftRoro && !draftContainer) return;
    setCreating(true);
    try {
      const created = await onCreate(trimmedQuery, draftRoro, draftContainer);
      onChange(created);
      setOptions((previous) => [...previous.filter((o) => o.id !== created.id), created]);
      setOpen(false);
      setQuery("");
      setDrafting(false);
    } finally {
      setCreating(false);
    }
  }

  function startEditing(option: FreightAgentOption) {
    setEditingId(option.id);
    setEditingName(option.name);
    setEditingRoro(option.offersRoro);
    setEditingContainer(option.offersContainer);
  }

  async function handleSaveEdit(option: FreightAgentOption) {
    const trimmed = editingName.trim();
    if (!trimmed || (!editingRoro && !editingContainer)) return;
    setSaving(true);
    try {
      const updated = await onUpdate(option, trimmed, editingRoro, editingContainer);
      setOptions((previous) => previous.map((o) => (o.id === option.id ? updated : o)));
      if (value?.id === option.id) {
        onChange(updated);
      }
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  function handleSelect(option: FreightAgentOption) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
      </Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setDrafting(false);
            setEditingId(null);
          }
        }}
      >
        <PopoverTrigger
          id={id}
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
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={(next) => {
                setQuery(next);
                setDrafting(false);
              }}
              placeholder="Search freight agents…"
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </div>
              )}
              {!loading && options.length === 0 && !trimmedQuery && (
                <CommandEmpty>Type to search freight agents…</CommandEmpty>
              )}
              {!loading && (
                <CommandGroup>
                  {options.map((option) =>
                    editingId === option.id ? (
                      <div key={option.id} className="space-y-2 px-2 py-2">
                        <div className="flex items-center gap-1">
                          <Input
                            autoFocus
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            disabled={saving}
                            className="h-7 flex-1 text-sm"
                            onKeyDown={(event) => {
                              if (event.key === "Escape") setEditingId(null);
                            }}
                          />
                          <button
                            type="button"
                            disabled={saving || (!editingRoro && !editingContainer) || !editingName.trim()}
                            onClick={() => handleSaveEdit(option)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                            aria-label={`Save changes to ${option.name}`}
                          >
                            {saving ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setEditingId(null)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                            aria-label="Cancel edit"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <CapabilityToggles
                          offersRoro={editingRoro}
                          offersContainer={editingContainer}
                          onToggleRoro={() => setEditingRoro((v) => !v)}
                          onToggleContainer={() => setEditingContainer((v) => !v)}
                        />
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
                        <span className="flex gap-1">
                          {option.offersRoro && (
                            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              RORO
                            </span>
                          )}
                          {option.offersContainer && (
                            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              Container
                            </span>
                          )}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Edit ${option.name}`}
                          className="rounded p-1 opacity-0 hover:bg-muted group-hover/command-item:opacity-100"
                          onMouseDown={(event) => {
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
                      </CommandItem>
                    )
                  )}
                  {trimmedQuery &&
                    !hasExactMatch &&
                    (drafting ? (
                      <div className="space-y-2 border-t px-2 py-2">
                        <p className="text-xs text-muted-foreground">
                          Add &quot;{trimmedQuery}&quot; as new freight agent — select what it offers:
                        </p>
                        <CapabilityToggles
                          offersRoro={draftRoro}
                          offersContainer={draftContainer}
                          onToggleRoro={() => setDraftRoro((v) => !v)}
                          onToggleContainer={() => setDraftContainer((v) => !v)}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDrafting(false)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={creating || (!draftRoro && !draftContainer)}
                            onClick={handleCreate}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "h-6 px-2 text-xs"
                            )}
                          >
                            {creating ? <Loader2 className="size-3.5 animate-spin" /> : "Add agent"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <CommandItem value={`__create__${trimmedQuery}`} onSelect={startDraft}>
                        <Plus className="size-4" />
                        Add &quot;{trimmedQuery}&quot; as new freight agent
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
