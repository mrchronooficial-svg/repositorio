"use client";

import { useFluctuatingNumber } from "@/lib/catalogo/drop";

interface EngagementIndicatorsProps {
  viewersBase: number;
  messagesBase: number;
}

export function EngagementIndicators({ viewersBase, messagesBase }: EngagementIndicatorsProps) {
  const viewers = useFluctuatingNumber(viewersBase, 4000);
  const messages = useFluctuatingNumber(messagesBase, 5000);

  return (
    <div className="mx-4 flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
      <div className="flex items-center gap-2 text-sm">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white/80 tabular-nums transition-all duration-700">{viewers}</span>
        <span className="text-white/40 text-xs">online</span>
      </div>
      <div className="w-px h-4 bg-white/10" />
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white/40">💬</span>
        <span className="text-white/80 tabular-nums transition-all duration-700">{messages}</span>
        <span className="text-white/40 text-xs">mensagens</span>
      </div>
    </div>
  );
}
