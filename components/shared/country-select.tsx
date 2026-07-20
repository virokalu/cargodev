"use client";

// Searchable country picker with flags — used for the vehicle Destination
// field. Unlike ComboboxCreate, this never creates anything: the country
// list is a fixed reference list (Tech Doc §2 field 13, "country select —
// any country"), not an org-managed lookup, so there's no inline-create here.

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
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
import type { CountryOption } from "@/lib/constants/countries";

interface CountrySelectProps {
  id: string;
  label: string;
  options: CountryOption[];
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

export function CountrySelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Select country",
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.name === value);

  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-full justify-between px-2.5 font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selected ? `${selected.flag} ${selected.name}` : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries…" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.name}
                    value={option.name}
                    onSelect={() => {
                      onChange(option.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", value === option.name ? "opacity-100" : "opacity-0")}
                    />
                    <span>{option.flag}</span>
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
