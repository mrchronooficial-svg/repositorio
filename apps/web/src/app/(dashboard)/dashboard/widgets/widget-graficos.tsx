"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface GraficosProps {
  evolucaoVendas?: Array<{
    mes: string;
    vendas: number;
    faturamento: number | null;
  }>;
  isLoadingEvolucao: boolean;
  podeVerValores: boolean;
  metricas: {
    estoque: {
      emEstoque: number;
      estoqueIdeal: number;
      disponivel: number;
      emTransito: number;
      emRevisao: number;
      abaixoIdeal: boolean;
    };
  };
}

export function WidgetGraficos({
  evolucaoVendas,
  isLoadingEvolucao,
  podeVerValores,
  metricas,
}: GraficosProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Grafico de evolucao */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Evolucao de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEvolucao ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="h-64 flex items-end justify-between gap-2">
              {evolucaoVendas?.map((item, index) => {
                const maxVendas = Math.max(
                  ...evolucaoVendas.map((e) => e.vendas),
                  1
                );
                const height = (item.vendas / maxVendas) * 100;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="w-full flex flex-col items-center justify-end h-48">
                      <span className="text-sm font-medium mb-1">
                        {item.vendas}
                      </span>
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.mes}
                    </span>
                    {podeVerValores && item.faturamento !== null && (
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.faturamento)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de estoque ideal */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Estoque</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Disponiveis</span>
            <span className="font-bold">{metricas.estoque.disponivel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Estoque Ideal</span>
            <span className="font-bold">{metricas.estoque.estoqueIdeal}</span>
          </div>

          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  metricas.estoque.abaixoIdeal
                    ? "bg-amber-500"
                    : "bg-green-500"
                )}
                style={{
                  width: `${Math.min(
                    (metricas.estoque.disponivel /
                      (metricas.estoque.estoqueIdeal || 1)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
            <p
              className={cn(
                "text-xs text-center",
                metricas.estoque.abaixoIdeal
                  ? "text-amber-600"
                  : "text-green-600"
              )}
            >
              {metricas.estoque.abaixoIdeal
                ? `Faltam ${metricas.estoque.estoqueIdeal - metricas.estoque.disponivel} pecas`
                : "Estoque adequado"}
            </p>
          </div>

          {/* Detalhamento */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Disponiveis
              </span>
              <span>{metricas.estoque.disponivel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Em Transito
              </span>
              <span>{metricas.estoque.emTransito}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Em Revisao
              </span>
              <span>{metricas.estoque.emRevisao}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
