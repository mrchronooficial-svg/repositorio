"use client";

import { Watch } from "lucide-react";

interface EmptyStateProps {
  isFiltered?: boolean;
}

export function EmptyState({ isFiltered }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#0a1628]/5 flex items-center justify-center mb-6">
        <Watch className="h-8 w-8 text-[#0a1628]/30" />
      </div>
      <h3
        className="text-xl font-semibold text-[#0a1628] mb-2"
        style={{ fontFamily: "var(--font-cormorant), serif" }}
      >
        {isFiltered ? "Nenhuma peça encontrada" : "Novas peças em breve"}
      </h3>
      <p
        className="text-sm text-[#0a1628]/50 max-w-[280px]"
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        {isFiltered
          ? "Tente ajustar os filtros para ver mais opções."
          : "Estamos selecionando novas peças com curadoria. Volte em breve."}
      </p>
    </div>
  );
}
