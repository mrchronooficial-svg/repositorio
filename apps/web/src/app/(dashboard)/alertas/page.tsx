"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  AlertTriangle,
  Package,
  Clock,
  Banknote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
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
  ESTOQUE_BAIXO: "text-amber-600 bg-amber-50 border-amber-200",
  RELOJOEIRO_DEMORADO: "text-orange-600 bg-orange-50 border-orange-200",
  REPASSE_PENDENTE: "text-blue-600 bg-blue-50 border-blue-200",
};

const TIPO_LABELS: Record<TipoAlerta, string> = {
  ESTOQUE_BAIXO: "Estoque Baixo",
  RELOJOEIRO_DEMORADO: "Relojoeiro Demorado",
  REPASSE_PENDENTE: "Repasse Pendente",
};

export default function AlertasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tipoFiltro, setTipoFiltro] = useState<TipoAlerta | "all">("all");
  const [lidoFiltro, setLidoFiltro] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);

  const queryOptions = trpc.alerta.list.queryOptions({
    page,
    limit: 20,
    tipo: tipoFiltro === "all" ? undefined : tipoFiltro,
    lido: lidoFiltro === "all" ? undefined : lidoFiltro === "true",
  });

  const { data, isLoading } = useQuery(queryOptions);

  const marcarLidoMutation = useMutation(
    trpc.alerta.marcarLido.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
        queryClient.invalidateQueries({ queryKey: ["alerta", "listNaoLidos"] });
      },
    })
  );

  const marcarTodosLidosMutation = useMutation(
    trpc.alerta.marcarTodosLidos.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
        queryClient.invalidateQueries({ queryKey: ["alerta", "listNaoLidos"] });
      },
    })
  );

  const handleAlertaClick = (alerta: NonNullable<typeof data>["alertas"][0]) => {
    if (!alerta.lido) {
      marcarLidoMutation.mutate({ id: alerta.id });
    }

    if (alerta.entidade && alerta.entidadeId) {
      if (alerta.entidade === "PECA") {
        router.push(`/estoque/${alerta.entidadeId}` as Route);
      } else if (alerta.entidade === "VENDA") {
        router.push(`/vendas/${alerta.entidadeId}` as Route);
      }
    }
  };

  const limparFiltros = () => {
    setTipoFiltro("all");
    setLidoFiltro("all");
    setPage(1);
  };

  const temFiltros = tipoFiltro !== "all" || lidoFiltro !== "all";
  const alertasNaoLidos = data?.alertas.filter((a) => !a.lido).length ?? 0;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Alertas" }]} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Alertas</h1>
            <p className="text-muted-foreground">
              {data?.total ?? 0} alerta(s) no total
              {alertasNaoLidos > 0 && (
                <span className="ml-2 text-amber-600">
                  ({alertasNaoLidos} nao lido(s))
                </span>
              )}
            </p>
          </div>
          {alertasNaoLidos > 0 && (
            <Button
              variant="outline"
              onClick={() => marcarTodosLidosMutation.mutate()}
              disabled={marcarTodosLidosMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-4 flex-wrap">
          <Select
            value={tipoFiltro}
            onValueChange={(value) => {
              setTipoFiltro(value as TipoAlerta | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo de alerta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="ESTOQUE_BAIXO">Estoque Baixo</SelectItem>
              <SelectItem value="RELOJOEIRO_DEMORADO">Relojoeiro Demorado</SelectItem>
              <SelectItem value="REPASSE_PENDENTE">Repasse Pendente</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={lidoFiltro}
            onValueChange={(value) => {
              setLidoFiltro(value as "all" | "true" | "false");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="false">Nao lidos</SelectItem>
              <SelectItem value="true">Lidos</SelectItem>
            </SelectContent>
          </Select>

          {temFiltros && (
            <Button variant="ghost" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Lista de alertas */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24" />
              </Card>
            ))}
          </div>
        ) : !data || data.alertas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum alerta encontrado</p>
              <p className="text-sm text-muted-foreground">
                {temFiltros
                  ? "Tente ajustar os filtros"
                  : "Voce nao tem alertas no momento"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.alertas.map((alerta) => {
              const Icon = ALERTA_ICONS[alerta.tipo as TipoAlerta] || AlertTriangle;
              const colorClass =
                ALERTA_COLORS[alerta.tipo as TipoAlerta] || "text-gray-600 bg-gray-50 border-gray-200";

              return (
                <Card
                  key={alerta.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    !alerta.lido && "border-l-4",
                    !alerta.lido && colorClass.split(" ").find((c) => c.startsWith("border-"))
                  )}
                  onClick={() => handleAlertaClick(alerta)}
                >
                  <CardContent className="flex gap-4 py-4">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0",
                        colorClass.split(" ").slice(0, 2).join(" ")
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{alerta.titulo}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alerta.mensagem}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!alerta.lido && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alerta.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            colorClass.split(" ").slice(0, 2).join(" ")
                          )}
                        >
                          {TIPO_LABELS[alerta.tipo as TipoAlerta] || alerta.tipo}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Paginacao */}
        {data && data.pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="py-2 px-4">
              Pagina {page} de {data.pages}
            </span>
            <Button
              variant="outline"
              disabled={page === data.pages}
              onClick={() => setPage(page + 1)}
            >
              Proxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
