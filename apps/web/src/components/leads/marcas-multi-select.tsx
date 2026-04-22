"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface MarcasMultiSelectProps {
  options: ReadonlyArray<string>;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MarcasMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Todas as marcas",
  className,
}: MarcasMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  function toggle(marca: string) {
    if (value.includes(marca)) onChange(value.filter((m) => m !== marca));
    else onChange([...value, marca]);
  }

  function clearAll() {
    onChange([]);
  }

  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? value[0]
        : `${value[0]} +${value.length - 1}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "h-9 px-3 inline-flex items-center justify-between gap-2 w-48 rounded-md border bg-background text-sm",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            value.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-64"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar marca..."
            className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {value.length > 0 && (
          <div className="px-2 py-1.5 border-b bg-muted/30 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {value.length} selecionada(s)
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearAll}
              className="h-6 px-2 text-xs"
            >
              Limpar
            </Button>
          </div>
        )}

        <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nenhuma marca encontrada
            </li>
          ) : (
            filtered.map((marca) => {
              const selected = value.includes(marca);
              return (
                <li key={marca}>
                  <button
                    type="button"
                    onClick={() => toggle(marca)}
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      selected && "text-foreground font-medium",
                    )}
                  >
                    <Checkbox
                      checked={selected}
                      tabIndex={-1}
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{marca}</span>
                    {selected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
