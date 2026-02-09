"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function FluxoCaixaPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const { data: dfc, isLoading } = useQuery(
    trpc.financeiro.getDFC.queryOptions({ mes, ano })
  );

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const mesProximo = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const MESES = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">
            Método indireto — parte do lucro líquido e ajusta por variações de balanço
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={mesAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center font-medium">
            {MESES[mes]} {ano}
          </div>
          <Button variant="outline" size="icon" onClick={mesProximo}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : dfc ? (
        <>
          {/* Resumo cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Caixa Operações</p>
                <p className={cn("text-lg font-bold", dfc.resumo.caixaOperacoes < 0 && "text-red-600")}>
                  {formatCurrency(dfc.resumo.caixaOperacoes)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Caixa Investimentos</p>
                <p className={cn("text-lg font-bold", dfc.resumo.caixaInvestimentos < 0 && "text-red-600")}>
                  {formatCurrency(dfc.resumo.caixaInvestimentos)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Caixa Financiamento</p>
                <p className={cn("text-lg font-bold", dfc.resumo.caixaFinanciamento < 0 && "text-red-600")}>
                  {formatCurrency(dfc.resumo.caixaFinanciamento)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Saldo Final</p>
                <p className={cn("text-lg font-bold", dfc.resumo.saldoFinal < 0 && "text-red-600")}>
                  {formatCurrency(dfc.resumo.saldoFinal)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela DFC */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">
                  FLUXO DE CAIXA — MÉTODO INDIRETO — {MESES[mes]} {ano}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-4 font-medium">Descrição</th>
                      <th className="text-right py-2 px-4 font-medium w-44">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dfc.linhas.map((linha, i) => {
                      if (linha.nivel === -1) {
                        return (
                          <tr key={i} className="h-2">
                            <td colSpan={2} />
                          </tr>
                        );
                      }

                      const paddingLeft = linha.nivel === 0 ? 16 : linha.nivel === 1 ? 32 : 48;

                      return (
                        <tr
                          key={i}
                          className={cn(
                            "border-b border-border/50",
                            linha.negrito && "bg-muted/30",
                            linha.descricao.startsWith("=") && "border-t-2 border-t-border"
                          )}
                        >
                          <td
                            className={cn("py-1.5 pr-4", linha.negrito && "font-semibold")}
                            style={{ paddingLeft }}
                          >
                            {linha.descricao}
                          </td>
                          <td
                            className={cn(
                              "text-right py-1.5 px-4 font-mono text-sm tabular-nums",
                              linha.negrito && "font-semibold",
                              linha.valor < 0 && "text-red-600"
                            )}
                          >
                            {(linha.nivel === 0 && !linha.descricao.startsWith("=") && !linha.descricao.includes("Saldo"))
                              ? ""
                              : linha.valor !== 0
                                ? formatCurrency(linha.valor)
                                : "—"
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum dado encontrado para o período selecionado
          </CardContent>
        </Card>
      )}
    </div>
  );
}
