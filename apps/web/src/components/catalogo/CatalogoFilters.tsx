"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { X } from "lucide-react";
import { useCallback } from "react";

const FAIXAS_PRECO = [
  { label: "Até R$ 3.000", min: undefined, max: 3000 },
  { label: "R$ 3.000–5.000", min: 3000, max: 5000 },
  { label: "R$ 5.000–10.000", min: 5000, max: 10000 },
  { label: "R$ 10.000–15.000", min: 10000, max: 15000 },
  { label: "Acima de R$ 15.000", min: 15000, max: undefined },
] as const;

interface CatalogoFiltersProps {
  marca?: string;
  precoMin?: number;
  precoMax?: number;
}

export function CatalogoFilters({
  marca,
  precoMin,
  precoMax,
}: CatalogoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: marcas } = useQuery(
    trpc.catalogo.getMarcasDisponiveis.queryOptions()
  );

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === undefined) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      const qs = params.toString();
      const url = (qs ? `/catalogo?${qs}` : "/catalogo") as Route;
      router.replace(url, { scroll: false });
    },
    [router, searchParams]
  );

  const handleMarcaClick = (m: string) => {
    updateFilters({ marca: marca === m ? undefined : m });
  };

  const handlePrecoClick = (min?: number, max?: number) => {
    // Toggle: se já está selecionado, remove
    const isSame =
      (min === precoMin || (min === undefined && precoMin === undefined)) &&
      (max === precoMax || (max === undefined && precoMax === undefined));
    if (isSame) {
      updateFilters({ precoMin: undefined, precoMax: undefined });
    } else {
      updateFilters({
        precoMin: min?.toString(),
        precoMax: max?.toString(),
      });
    }
  };

  const clearAll = () => {
    router.replace("/catalogo" as Route, { scroll: false });
  };

  const hasFilters = marca || precoMin !== undefined || precoMax !== undefined;

  return (
    <div
      className="max-w-2xl mx-auto px-4 py-3 space-y-3"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {/* Marcas */}
      {marcas && marcas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {marcas.map((m) => (
            <button
              key={m}
              onClick={() => handleMarcaClick(m)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                marca === m
                  ? "bg-[#0a1628] text-white"
                  : "bg-[#0a1628]/5 text-[#0a1628]/70 hover:bg-[#0a1628]/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Faixas de preço */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FAIXAS_PRECO.map((faixa) => {
          const isActive =
            faixa.min === precoMin && faixa.max === precoMax;
          return (
            <button
              key={faixa.label}
              onClick={() => handlePrecoClick(faixa.min, faixa.max)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#0a1628] text-white"
                  : "bg-[#0a1628]/5 text-[#0a1628]/70 hover:bg-[#0a1628]/10"
              }`}
            >
              {faixa.label}
            </button>
          );
        })}
      </div>

      {/* Limpar filtros */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs text-[#0a1628]/50 hover:text-[#0a1628]/70 transition-colors"
        >
          <X className="h-3 w-3" />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
