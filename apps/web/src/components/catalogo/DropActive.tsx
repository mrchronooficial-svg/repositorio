"use client";

import { EngagementIndicators } from "./EngagementIndicators";
import { DropItemCard } from "./DropItemCard";

interface DropActiveProps {
  drop: {
    id: string;
    viewersBase: number;
    messagesBase: number;
    items: Array<{
      id: string;
      dropPrice: unknown;
      originalPrice: unknown;
      status: string;
      peca: {
        id: string;
        sku: string;
        marca: string;
        modelo: string;
        ano: number | null;
        tamanhoCaixa: number;
        materialCaixa: string | null;
        materialPulseira: string | null;
        valorEstimadoVenda: unknown;
        fotos: { id: string; url: string; ordem: number }[];
      };
    }>;
  };
  nextDrop?: { launchDateTime: string | Date; launchTime: string } | null;
}

export function DropActive({ drop }: DropActiveProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#121a2e] pb-20"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
      {/* Header */}
      <div className="pt-6 pb-4 px-4 text-center">
        <h2 className="text-amber-400 text-xs tracking-[0.3em] uppercase font-semibold mb-1">
          ⚡ Drop do Dia
        </h2>
        <p className="text-white/50 text-xs">Condições especiais por tempo limitado</p>
      </div>

      {/* Engagement indicators */}
      <EngagementIndicators viewersBase={drop.viewersBase} messagesBase={drop.messagesBase} />

      {/* Item cards */}
      <div className="px-4 space-y-4 mt-4">
        {drop.items.map((item, index) => (
          <DropItemCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}
