"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Eye, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { gerarNumeroUrgencia, getFaixaPreco } from "@/lib/catalogo/urgency";

interface UrgencyBadgesProps {
  pecaId: string;
  valor: number;
}

interface UrgencyNumbers {
  viewers: number;
  vendidos: number;
  interacoes: number;
}

export function UrgencyBadges({ pecaId, valor }: UrgencyBadgesProps) {
  const [numbers, setNumbers] = useState<UrgencyNumbers | null>(null);

  const { data: configs } = useQuery(
    trpc.catalogo.getConfiguracoes.queryOptions()
  );

  useEffect(() => {
    if (!configs) return;

    const faixa = getFaixaPreco(valor);

    const viewersMin = parseInt(configs[`catalogo_urgencia_viewers_min_${faixa}`] || "10");
    const viewersMax = parseInt(configs[`catalogo_urgencia_viewers_max_${faixa}`] || "30");
    const vendidosMin = parseInt(configs[`catalogo_urgencia_vendidos_min_${faixa}`] || "2");
    const vendidosMax = parseInt(configs[`catalogo_urgencia_vendidos_max_${faixa}`] || "5");
    const interacoesMin = parseInt(configs[`catalogo_urgencia_interacoes_min_${faixa}`] || "15");
    const interacoesMax = parseInt(configs[`catalogo_urgencia_interacoes_max_${faixa}`] || "40");

    const baseViewers = gerarNumeroUrgencia(pecaId, "viewers", viewersMin, viewersMax);

    setNumbers({
      viewers: baseViewers,
      vendidos: gerarNumeroUrgencia(pecaId, "vendidos", vendidosMin, vendidosMax),
      interacoes: gerarNumeroUrgencia(pecaId, "interacoes", interacoesMin, interacoesMax),
    });

    // Variação por faixa: baixo ±1, médio ±1-2, alto ±2-3
    const variacao = faixa === "baixo" ? 1 : faixa === "medio" ? 2 : 3;

    const interval = setInterval(() => {
      setNumbers((prev) => {
        if (!prev) return prev;
        const delta = Math.floor(Math.random() * (variacao * 2 + 1)) - variacao;
        return {
          ...prev,
          viewers: Math.max(viewersMin, Math.min(viewersMax, prev.viewers + delta)),
        };
      });
    }, 5000 + Math.random() * 3000); // 5-8s

    return () => clearInterval(interval);
  }, [configs, pecaId, valor]);

  if (!numbers) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-[#0a1628]/45">
        <TrendingUp className="h-3 w-3 shrink-0" />
        <span>
          <strong className="text-[#0a1628]/60">{numbers.vendidos}</strong> similares vendidos nos últimos 7 dias
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-[#0a1628]/45">
        <Eye className="h-3 w-3 shrink-0" />
        <span>
          <strong className="text-[#0a1628]/60 inline-block transition-all duration-500">{numbers.viewers}</strong> pessoas vendo agora
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-[#0a1628]/45">
        <Heart className="h-3 w-3 shrink-0" />
        <span>
          <strong className="text-[#0a1628]/60">{numbers.interacoes}</strong> pessoas interagiram com essa peça
        </span>
      </div>
    </div>
  );
}
