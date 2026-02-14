"use client";

import { useState } from "react";
import { Filter, X, ArrowUpNarrowWide, ArrowDownNarrowWide, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// --- Main wrapper: column header with popover ---

interface ColumnFilterHeaderProps {
  label: string;
  active: boolean;
  align?: "left" | "right";
  children: React.ReactNode;
}

export function ColumnFilterHeader({
  label,
  active,
  align = "left",
  children,
}: ColumnFilterHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors group ${
            align === "right" ? "ml-auto" : ""
          }`}
        >
          <span>{label}</span>
          {active ? (
            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          ) : (
            <Filter className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align === "right" ? "end" : "start"}
        className="w-60 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

// --- Text filter ---

interface TextColumnFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextColumnFilter({
  label,
  value,
  onChange,
  placeholder,
}: TextColumnFilterProps) {
  const [local, setLocal] = useState(value);

  const apply = () => {
    onChange(local.trim());
  };

  const clear = () => {
    setLocal("");
    onChange("");
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder || `Filtrar por ${label.toLowerCase()}...`}
        className="h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") apply();
        }}
      />
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
          Limpar
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={apply}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}

// --- Select filter ---

interface SelectOption {
  value: string;
  label: string;
}

interface SelectColumnFilterProps {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: SelectOption[];
}

export function SelectColumnFilter({
  label,
  value,
  onChange,
  options,
}: SelectColumnFilterProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
              value === opt.value ? "bg-muted font-medium" : ""
            }`}
            onClick={() => onChange(value === opt.value ? undefined : opt.value)}
          >
            <span className="w-4 shrink-0">
              {value === opt.value && <Check className="h-3.5 w-3.5 text-blue-500" />}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full mt-1"
          onClick={() => onChange(undefined)}
        >
          <X className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}

// --- Range filter ---

interface RangeColumnFilterProps {
  label: string;
  min: number | undefined;
  max: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
}

export function RangeColumnFilter({
  label,
  min,
  max,
  onChange,
}: RangeColumnFilterProps) {
  const [localMin, setLocalMin] = useState(min?.toString() ?? "");
  const [localMax, setLocalMax] = useState(max?.toString() ?? "");

  const apply = () => {
    const parsedMin = localMin ? parseFloat(localMin) : undefined;
    const parsedMax = localMax ? parseFloat(localMax) : undefined;
    onChange(
      parsedMin !== undefined && !isNaN(parsedMin) ? parsedMin : undefined,
      parsedMax !== undefined && !isNaN(parsedMax) ? parsedMax : undefined,
    );
  };

  const clear = () => {
    setLocalMin("");
    setLocalMax("");
    onChange(undefined, undefined);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-2 items-center">
        <Input
          type="number"
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          placeholder="Min"
          className="h-8 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
        />
        <span className="text-muted-foreground text-xs">a</span>
        <Input
          type="number"
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          placeholder="Max"
          className="h-8 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
        />
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
          Limpar
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={apply}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}

// --- Sort filter ---

interface SortColumnFilterProps {
  label: string;
  sortBy: string;
  sortDir: string;
  targetSortBy: string;
  onChange: (sortBy: string, sortDir: string) => void;
}

export function SortColumnFilter({
  label,
  sortBy,
  sortDir,
  targetSortBy,
  onChange,
}: SortColumnFilterProps) {
  const isActive = sortBy === targetSortBy;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <button
        type="button"
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
          isActive && sortDir === "asc" ? "bg-muted font-medium" : ""
        }`}
        onClick={() => onChange(targetSortBy, "asc")}
      >
        <ArrowUpNarrowWide className="h-3.5 w-3.5" />
        Menor para Maior
      </button>
      <button
        type="button"
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
          isActive && sortDir === "desc" ? "bg-muted font-medium" : ""
        }`}
        onClick={() => onChange(targetSortBy, "desc")}
      >
        <ArrowDownNarrowWide className="h-3.5 w-3.5" />
        Maior para Menor
      </button>
      {isActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full mt-1"
          onClick={() => onChange("createdAt", "desc")}
        >
          <X className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
