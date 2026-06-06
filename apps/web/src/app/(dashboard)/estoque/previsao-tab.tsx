"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PackageCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { PrevisaoChegadasChart } from "@/components/charts/previsao-chegadas-chart";
import { ChegadaDialog } from "@/components/dialogs/chegada-dialog";

export function PrevisaoTab() {
  const [dias, setDias] = useState<30 | 60>(30);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  const { data, isLoading } = useQuery(
    trpc.peca.getPrevisaoChegadas.queryOptions({ dias })
  );
  const { data: pendentes = [] } = useQuery(
    trpc.peca.getChegadasPendentes.queryOptions()
  );

  // Abrir o pop-up automaticamente ao entrar na aba se houver chegadas pendentes
  useEffect(() => {
    if (!autoOpened && pendentes.length > 0) {
      setDialogOpen(true);
      setAutoOpened(true);
    }
  }, [pendentes.length, autoOpened]);

  const totalAChegar = data ? data.totalPrevisto - data.estoqueAtual : 0;

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <div className="inline-flex rounded-lg border p-0.5">
            {[30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDias(d as 30 | 60)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  dias === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>

        {pendentes.length > 0 && (
          <Button
            variant="outline"
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => setDialogOpen(true)}
          >
            <AlertTriangle className="h-4 w-4" />
            {pendentes.length} chegada(s) a confirmar
          </Button>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estoque Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.estoqueAtual ?? 0}</div>
            <p className="text-xs text-muted-foreground">disponíveis na empresa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Chegar ({dias}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">+{totalAChegar}</div>
            <p className="text-xs text-muted-foreground">peças em trânsito</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Previsto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {data?.totalPrevisto ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">ao fim do período</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico cascata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Projeção de chegadas — próximos {dias} dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data && (data.estoqueAtual > 0 || data.chegadas.length > 0) ? (
            <PrevisaoChegadasChart data={data} />
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <PackageCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma peça em estoque ou prevista para chegar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ChegadaDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
