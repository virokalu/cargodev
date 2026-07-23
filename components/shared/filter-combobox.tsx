"use client";

// Search-as-you-type combobox for filtering (not creating) — the vehicle
// filter panel's Brand/Model/Grade/Auction Hall/Freight Agent/Vehicle
// Location/Customer filters all use this. Modeled on combobox-create.tsx's
// Popover+Command shell but simplified: single select, no create/rename, and
// an "All …" item pinned at the top of the list to clear the filter.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  name: string;
}

interface FilterComboboxProps {
  /** null = not filtering on this field ("All"). */
  value: FilterOption | null;
  onChange: (value: FilterOption | null) => void;
  search: (query: string) => Promise<FilterOption[]>;
  /** Shown on the trigger when nothing is selected, e.g. "All auction halls". */
  placeholder: string;
  /** The pinned "clear filter" item's label, e.g. "All auction halls". */
  allLabel: string;
  disabled?: boolean;
  disabledHint?: string;
}

const DEBOUNCE_MS = 250;

export function FilterCombobox({
  value,
  onChange,
  search,
  placeholder,
  allLabel,
  disabled,
  disabledHint,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
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

  function handleSelect(option: FilterOption | null) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-full justify-between px-2.5 font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{value?.name ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder="Search…" />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </div>
              ) : (
                <CommandGroup>
                  <CommandItem value="__all__" onSelect={() => handleSelect(null)}>
                    <Check className={cn("size-4", !value ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{allLabel}</span>
                  </CommandItem>
                  {options.map((option) => (
                    <CommandItem key={option.id} value={option.id} onSelect={() => handleSelect(option)}>
                      <Check className={cn("size-4", value?.id === option.id ? "opacity-100" : "opacity-0")} />
                      <span className="flex-1 truncate">{option.name}</span>
                    </CommandItem>
                  ))}
                  {options.length === 0 && query.trim() && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No matches for &quot;{query.trim()}&quot;
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {disabled && disabledHint && <p className="mt-1 text-xs text-muted-foreground">{disabledHint}</p>}
    </div>
  );
}
