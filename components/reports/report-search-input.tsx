"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ReportSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function ReportSearchInput({ value, onChange, placeholder }: ReportSearchInputProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-9"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
