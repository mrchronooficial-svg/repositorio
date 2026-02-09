"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, AlertTriangle, Package, Clock, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type TipoAlerta = "ESTOQUE_BAIXO" | "RELOJOEIRO_DEMORADO" | "REPASSE_PENDENTE";

const ALERTA_ICONS: Record<TipoAlerta, typeof AlertTriangle> = {
  ESTOQUE_BAIXO: Package,
  RELOJOEIRO_DEMORADO: Clock,
  REPASSE_PENDENTE: Banknote,
};

const ALERTA_COLORS: Record<TipoAlerta, string> = {
  ESTOQUE_BAIXO: "text-amber-600 bg-amber-50",
  RELOJOEIRO_DEMORADO: "text-orange-600 bg-orange-50",
  REPASSE_PENDENTE: "text-blue-600 bg-blue-50",
};

export function Notifications() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const queryOptions = trpc.alerta.listNaoLidos.queryOptions();
  const { data: alertas = [] } = useQuery({
    ...queryOptions,
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  const marcarLidoMutation = useMutation(
    trpc.alerta.marcarLido.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
    })
  );

  const marcarTodosLidosMutation = useMutation(
    trpc.alerta.marcarTodosLidos.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
    })
  );

  const count = alertas.length;

  const handleAlertaClick = (alerta: (typeof alertas)[0]) => {
    marcarLidoMutation.mutate({ id: alerta.id });

    // Navegar para a entidade relacionada se existir
    if (alerta.entidade && alerta.entidadeId) {
      if (alerta.entidade === "PECA") {
        router.push(`/estoque/${alerta.entidadeId}` as Route);
      } else if (alerta.entidade === "VENDA") {
        router.push(`/vendas/${alerta.entidadeId}` as Route);
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-medium">Notificacoes</span>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => marcarTodosLidosMutation.mutate()}
              disabled={marcarTodosLidosMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {count === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma notificacao no momento</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {alertas.map((alerta) => {
                const Icon = ALERTA_ICONS[alerta.tipo as TipoAlerta] || AlertTriangle;
                const colorClass = ALERTA_COLORS[alerta.tipo as TipoAlerta] || "text-gray-600 bg-gray-50";

                return (
                  <button
                    key={alerta.id}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex gap-3"
                    onClick={() => handleAlertaClick(alerta)}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                        colorClass
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alerta.titulo}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {alerta.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alerta.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {count > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/alertas")}
            >
              Ver todos os alertas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
