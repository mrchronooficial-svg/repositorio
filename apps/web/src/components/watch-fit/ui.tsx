"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// =====================================================
// Primitivos visuais "luxury minimal" do Watch Fit
// Paleta: creme #F5F3EF, preto #1A1A1A, dourado #B8960C
// =====================================================

const baseField =
  "w-full min-h-12 px-4 py-3 bg-white border border-[#E5E2DD] rounded-sm " +
  "text-[#1A1A1A] placeholder:text-[#9A958C] " +
  "transition-all duration-200 outline-none " +
  "focus:border-[#B8960C] focus:ring-1 focus:ring-[#B8960C]/30 " +
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
      className="block mb-2 text-[13px] font-medium tracking-wide uppercase text-[#3D3A33]"
    >
      {children}
      {required && <span className="ml-1 text-[#B8960C]">*</span>}
      {hint && (
        <span className="ml-2 normal-case tracking-normal text-[11px] text-[#9A958C] font-normal">
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

export const LuxInput = forwardRef<HTMLInputElement, InputProps>(
  function LuxInput({ error, prefix, className = "", ...props }, ref) {
    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A958C] text-sm pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          {...props}
          className={`${baseField} ${prefix ? "pl-7" : ""} ${error ? "border-[#9B2C2C] focus:border-[#9B2C2C] focus:ring-[#9B2C2C]/20" : ""} ${className}`}
        />
        {error && <p className="mt-1.5 text-xs text-[#9B2C2C]">{error}</p>}
      </div>
    );
  },
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  maxChars?: number;
}

export function LuxTextarea({ error, maxChars, value, className = "", ...props }: TextareaProps) {
  const len = typeof value === "string" ? value.length : 0;
  return (
    <div>
      <textarea
        {...props}
        value={value}
        maxLength={maxChars}
        className={`${baseField} min-h-28 resize-none leading-relaxed ${error ? "border-[#9B2C2C]" : ""} ${className}`}
      />
      <div className="mt-1.5 flex items-center justify-between text-xs">
        {error ? <span className="text-[#9B2C2C]">{error}</span> : <span />}
        {maxChars && (
          <span className="text-[#9A958C] tabular-nums">
            {len}/{maxChars}
          </span>
        )}
      </div>
    </div>
  );
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string | { label: string; value: string }>;
  placeholder?: string;
  error?: string;
}

export function LuxSelect({ id, value, onChange, options, placeholder, error }: SelectProps) {
  return (
    <div>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseField} appearance-none pr-10 ${error ? "border-[#9B2C2C]" : ""} ${value === "" ? "text-[#9A958C]" : ""}`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const v = typeof opt === "string" ? opt : opt.value;
            const l = typeof opt === "string" ? opt : opt.label;
            return (
              <option key={v} value={v} className="text-[#1A1A1A]">
                {l}
              </option>
            );
          })}
        </select>
        <svg
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#9A958C]"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error && <p className="mt-1.5 text-xs text-[#9B2C2C]">{error}</p>}
    </div>
  );
}

interface LuxButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  loading?: boolean;
  children: ReactNode;
}

export function LuxButton({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: LuxButtonProps) {
  const variants = {
    primary:
      "bg-[#1A1A1A] text-[#F5F3EF] hover:bg-[#B8960C] disabled:bg-[#3D3A33] disabled:hover:bg-[#3D3A33]",
    ghost:
      "bg-transparent text-[#3D3A33] hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5",
    outline:
      "bg-transparent text-[#1A1A1A] border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F3EF]",
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-sm
        text-sm font-medium tracking-[0.08em] uppercase
        transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70
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

// Card selecionável (usado em "Tipo de busca" e nos cards de estilo)
interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function SelectCard({ selected, onClick, title, description, icon }: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full text-left p-6 sm:p-7 rounded-sm border transition-all duration-300
        ${
          selected
            ? "border-[#B8960C] bg-white shadow-[0_0_0_1px_#B8960C_inset]"
            : "border-[#E5E2DD] bg-white hover:border-[#B8960C]/60"
        }`}
    >
      {selected && (
        <span className="absolute top-4 right-4 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#B8960C] text-white">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {icon && <div className="mb-4 text-[#3D3A33]">{icon}</div>}
      <h3
        className="text-xl sm:text-2xl text-[#1A1A1A] mb-1"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#5C5852] leading-relaxed">{description}</p>
      )}
    </button>
  );
}

// Chip clicável (usado em multi-selects: marcas, pulseiras, estilos)
interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function Chip({ selected, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-sm transition-all duration-200 border
        ${
          selected
            ? "border-[#B8960C] bg-[#B8960C] text-white shadow-sm"
            : "border-[#E5E2DD] bg-white text-[#3D3A33] hover:border-[#B8960C]/60 hover:text-[#1A1A1A]"
        }`}
    >
      {children}
    </button>
  );
}

// Combobox com busca (usado no dropdown de Marca do Step 3A)
interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: string;
}

export function LuxCombobox({
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
      // Foco no input após o popover abrir/montar
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
            className={`relative ${baseField} text-left pr-10 ${error ? "border-[#9B2C2C]" : ""} ${value === "" ? "text-[#9A958C]" : ""}`}
          >
            <span className="block truncate">{value || placeholder}</span>
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#9A958C]"
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
          className="p-0 bg-white border border-[#E5E2DD] rounded-sm shadow-xl"
          style={{ width: "var(--radix-popover-trigger-width)" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2 border-b border-[#E5E2DD]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="w-full px-3 py-2 text-sm bg-transparent border border-[#E5E2DD] rounded-sm outline-none focus:border-[#B8960C] focus:ring-1 focus:ring-[#B8960C]/30 placeholder:text-[#9A958C]"
            />
          </div>
          <ul
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-[#9A958C]">
                {emptyMessage}
              </li>
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
                      // Evita perder foco antes do click
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between
                      ${active ? "bg-[#F5F3EF]" : "bg-white"}
                      ${selected ? "text-[#B8960C] font-medium" : "text-[#1A1A1A]"}`}
                  >
                    <span className="truncate">{opt}</span>
                    {selected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-[#B8960C]">
                        <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1.5 text-xs text-[#9B2C2C]">{error}</p>}
    </div>
  );
}

// Swatch de cor (mostrador)
interface ColorSwatchProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  hex: string; // string vazia = swatch "outra" (gradient)
}

export function ColorSwatch({ selected, onClick, label, hex }: ColorSwatchProps) {
  const isOutra = hex === "";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`relative flex flex-col items-center gap-2 p-2 rounded-sm transition-all duration-200
        ${selected ? "" : "opacity-90 hover:opacity-100"}`}
    >
      <span
        className={`relative block w-12 h-12 rounded-full transition-all duration-200
          ${selected ? "ring-2 ring-offset-2 ring-offset-[#F5F3EF] ring-[#B8960C] scale-105" : "ring-1 ring-[#E5E2DD]"}`}
        style={
          isOutra
            ? {
                background:
                  "conic-gradient(from 0deg, #1A1A1A, #1E3A5F, #1F4E3D, #C5A35A, #A8AFB4, #F4F1EC, #1A1A1A)",
              }
            : { backgroundColor: hex }
        }
      >
        {selected && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shadow">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-6" stroke="#B8960C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
        )}
      </span>
      <span className="text-[11px] tracking-wide text-[#3D3A33] text-center leading-tight max-w-[80px]">
        {label}
      </span>
    </button>
  );
}
