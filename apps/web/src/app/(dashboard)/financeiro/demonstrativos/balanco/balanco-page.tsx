"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function BalancoTable({ linhas, titulo }: { linhas: { codigo: string; nome: string; valor: number; nivel: number; negrito?: boolean }[]; titulo: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2 px-4 font-medium">Conta</th>
              <th className="text-right py-2 px-4 font-medium w-44">Saldo (R$)</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => {
              const paddingLeft = linha.nivel === 0 ? 16 : linha.nivel === 1 ? 32 : linha.nivel === 2 ? 48 : 64;

              return (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-border/50",
                    linha.negrito && "bg-muted/30",
                    linha.nivel === 0 && "border-t-2 border-t-border"
                  )}
                >
                  <td
                    className={cn("py-1.5 pr-4", linha.negrito && "font-semibold")}
                    style={{ paddingLeft }}
                  >
                    {linha.codigo && (
                      <span className="text-muted-foreground mr-2 text-xs">{linha.codigo}</span>
                    )}
                    {linha.nome}
                  </td>
                  <td
                    className={cn(
                      "text-right py-1.5 px-4 font-mono text-sm tabular-nums",
                      linha.negrito && "font-semibold",
                      linha.valor < 0 && "text-red-600"
                    )}
                  >
                    {formatCurrency(linha.valor)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function BalancoPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const { data: balanco, isLoading } = useQuery(
    trpc.financeiro.getBalanco.queryOptions({ mes, ano })
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
          <h1 className="text-2xl font-bold">Balanço Patrimonial</h1>
          <p className="text-muted-foreground">
            Posição patrimonial acumulada até o final do período
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
      ) : balanco ? (
        <>
          {/* Verificação de equilíbrio */}
          <Card className={balanco.equilibrado ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="py-3 flex items-center gap-3">
              {balanco.equilibrado ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Balanço equilibrado</p>
                    <p className="text-sm text-green-600">
                      Ativo ({formatCurrency(balanco.totalAtivo)}) = Passivo + PL ({formatCurrency(balanco.totalPassivo)})
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Balanço desequilibrado</p>
                    <p className="text-sm text-red-600">
                      Ativo ({formatCurrency(balanco.totalAtivo)}) ≠ Passivo + PL ({formatCurrency(balanco.totalPassivo)})
                      — Diferença: {formatCurrency(Math.abs(balanco.totalAtivo - balanco.totalPassivo))}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resumo totais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Scale className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total do Ativo</p>
                    <p className="text-2xl font-bold">{formatCurrency(balanco.totalAtivo)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Scale className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Passivo + PL</p>
                    <p className="text-2xl font-bold">{formatCurrency(balanco.totalPassivo)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabelas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BalancoTable linhas={balanco.ativo} titulo={`ATIVO — ${balanco.data}`} />
            <BalancoTable linhas={balanco.passivo} titulo={`PASSIVO + PL — ${balanco.data}`} />
          </div>
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
