"use client";

import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/formatters";
import { ArrowRight } from "lucide-react";

interface HistoricoItem {
  id: string;
  statusAnterior: string | null;
  statusNovo: string;
  localizacaoAnterior: string | null;
  localizacaoNova: string | null;
  createdAt: Date | string;
  user: { name: string } | null;
}

interface HistoricoStatusProps {
  historico: HistoricoItem[];
}

export function HistoricoStatus({ historico }: HistoricoStatusProps) {
  if (historico.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum historico registrado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {historico.map((item, index) => (
        <div
          key={item.id}
          className="relative pl-6 pb-4 border-l-2 border-muted last:border-l-transparent last:pb-0"
        >
          {/* Marcador */}
          <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-primary" />

          {/* Conteudo */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {item.statusAnterior ? (
                <>
                  <StatusBadge type="peca" status={item.statusAnterior} size="sm" />
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <StatusBadge type="peca" status={item.statusNovo} size="sm" />
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">Criado como</span>
                  <StatusBadge type="peca" status={item.statusNovo} size="sm" />
                </>
              )}
            </div>

            {(item.localizacaoAnterior || item.localizacaoNova) && (
              <p className="text-sm text-muted-foreground">
                {item.localizacaoAnterior && item.localizacaoNova
                  ? `${item.localizacaoAnterior} → ${item.localizacaoNova}`
                  : item.localizacaoNova}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDateTime(item.createdAt)}</span>
              {item.user && (
                <>
                  <span>•</span>
                  <span>{item.user.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
