"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// =====================================================
// Primitivos visuais "dark luxury" — Comunidade VIP
// Paleta: bg #0A0A0A, surface #141414, ouro #C9A84C,
// texto #F5F3EF, muted #A0A0A0, borda rgba(255,255,255,0.08)
// =====================================================

const baseField =
  "w-full min-h-12 px-4 py-3 bg-white/[0.02] border border-white/[0.10] rounded-sm " +
  "text-[#F5F3EF] placeholder:text-[#6B6B6B] " +
  "transition-all duration-200 outline-none " +
  "hover:border-white/[0.18] " +
  "focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 focus:bg-white/[0.03] " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

interface FieldLabelProps {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}

export function FieldLabel({ htmlFor, children, required, hint }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-2 text-[12px] font-medium tracking-[0.12em] uppercase text-[#A0A0A0]"
    >
      {children}
      {required && <span className="ml-1 text-[#C9A84C]">*</span>}
      {hint && (
        <span className="ml-2 normal-case tracking-normal text-[11px] text-[#6B6B6B] font-normal">
          {hint}
        </span>
      )}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  prefix?: string;
}

export const VipInput = forwardRef<HTMLInputElement, InputProps>(
  function VipInput({ error, prefix, className = "", ...props }, ref) {
    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-sm pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          {...props}
          className={`${baseField} ${prefix ? "pl-7" : ""} ${error ? "border-[#E15B5B] focus:border-[#E15B5B] focus:ring-[#E15B5B]/20" : ""} ${className}`}
        />
        {error && <p className="mt-1.5 text-xs text-[#E15B5B]">{error}</p>}
      </div>
    );
  },
);

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string | { label: string; value: string }>;
  placeholder?: string;
  error?: string;
}

export function VipSelect({ id, value, onChange, options, placeholder, error }: SelectProps) {
  return (
    <div>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseField} appearance-none pr-10 cursor-pointer ${error ? "border-[#E15B5B]" : ""} ${value === "" ? "text-[#6B6B6B]" : ""}`}
          style={{ colorScheme: "dark" }}
        >
          {placeholder && (
            <option value="" disabled className="bg-[#141414] text-[#6B6B6B]">
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const v = typeof opt === "string" ? opt : opt.value;
            const l = typeof opt === "string" ? opt : opt.label;
            return (
              <option key={v} value={v} className="bg-[#141414] text-[#F5F3EF]">
                {l}
              </option>
            );
          })}
        </select>
        <svg
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#A0A0A0]"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error && <p className="mt-1.5 text-xs text-[#E15B5B]">{error}</p>}
    </div>
  );
}

interface VipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  loading?: boolean;
  children: ReactNode;
}

export function VipButton({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: VipButtonProps) {
  const variants = {
    primary:
      "bg-[#C9A84C] text-[#0A0A0A] hover:bg-[#D9B95C] hover:shadow-[0_0_24px_rgba(201,168,76,0.25)] disabled:bg-[#3D3A33] disabled:text-[#6B6B6B] disabled:hover:shadow-none",
    ghost:
      "bg-transparent text-[#A0A0A0] hover:text-[#F5F3EF] hover:bg-white/[0.04]",
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-sm
        text-sm font-medium tracking-[0.14em] uppercase
        transition-all duration-300 disabled:cursor-not-allowed
        ${variants[variant]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}

// Card selecionável (Sim/Não, objetivos)
interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function VipSelectCard({ selected, onClick, title, description, icon }: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full text-left p-5 sm:p-6 rounded-sm border transition-all duration-300
        ${
          selected
            ? "border-[#C9A84C] bg-[#C9A84C]/[0.06] shadow-[0_0_0_1px_#C9A84C_inset]"
            : "border-white/[0.10] bg-white/[0.02] hover:border-[#C9A84C]/50 hover:bg-white/[0.03]"
        }`}
    >
      {selected && (
        <span className="absolute top-3 right-3 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#C9A84C] text-[#0A0A0A]">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      {icon && <div className="mb-3 text-[#C9A84C]">{icon}</div>}
      <h3
        className="text-lg sm:text-xl text-[#F5F3EF] mb-1"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#A0A0A0] leading-relaxed">{description}</p>
      )}
    </button>
  );
}

// Chip clicável (multi-select de marcas, objetivos)
interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function VipChip({ selected, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border
        ${
          selected
            ? "border-[#C9A84C] bg-[#C9A84C] text-[#0A0A0A] shadow-[0_0_12px_rgba(201,168,76,0.20)]"
            : "border-white/[0.12] bg-white/[0.02] text-[#A0A0A0] hover:border-[#C9A84C]/50 hover:text-[#F5F3EF]"
        }`}
    >
      {children}
    </button>
  );
}

// Combobox com busca (Marca preferida)
interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: string;
}

export function VipCombobox({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado",
  error,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlighted(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  function handleSelect(option: string) {
    onChange(option);
    setOpen(false);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlighted];
      if (opt) handleSelect(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            className={`relative ${baseField} text-left pr-10 ${error ? "border-[#E15B5B]" : ""} ${value === "" ? "text-[#6B6B6B]" : ""}`}
          >
            <span className="block truncate">{value || placeholder}</span>
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#A0A0A0]"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="p-0 bg-[#141414] border border-white/[0.10] rounded-sm shadow-2xl"
          style={{ width: "var(--radix-popover-trigger-width)" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2 border-b border-white/[0.08]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="w-full px-3 py-2 text-sm bg-transparent border border-white/[0.10] rounded-sm outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/30 placeholder:text-[#6B6B6B] text-[#F5F3EF]"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-[#6B6B6B]">{emptyMessage}</li>
            ) : (
              filtered.map((opt, idx) => {
                const selected = opt === value;
                const active = idx === highlighted;
                return (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between
                      ${active ? "bg-white/[0.04]" : ""}
                      ${selected ? "text-[#C9A84C] font-medium" : "text-[#F5F3EF]"}`}
                  >
                    <span className="truncate">{opt}</span>
                    {selected && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="shrink-0 text-[#C9A84C]"
                      >
                        <path
                          d="M2 6l3 3 5-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1.5 text-xs text-[#E15B5B]">{error}</p>}
    </div>
  );
}

// Section heading (numerada, com linha sutil)
interface SectionHeadingProps {
  number: string;
  title: string;
  description?: string;
}

export function VipSectionHeading({ number, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-7">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-[10px] tracking-[0.4em] uppercase text-[#C9A84C]">
          {number}
        </span>
        <span className="flex-1 h-px bg-gradient-to-r from-[#C9A84C]/30 via-white/[0.08] to-transparent" />
      </div>
      <h2
        className="text-2xl sm:text-[1.75rem] text-[#F5F3EF] leading-tight"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm text-[#A0A0A0] leading-relaxed">{description}</p>
      )}
    </div>
  );
}
