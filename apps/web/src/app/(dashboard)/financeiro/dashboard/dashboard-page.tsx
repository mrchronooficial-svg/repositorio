"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertTriangle,
  Receipt,
  BarChart3,
  Percent,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DashboardFinanceiroPage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: dashboard, isLoading } = useQuery(
    trpc.financeiro.getDashboard.queryOptions()
  );

  const corrigirValorDeclaraMutation = useMutation(
    trpc.financeiro.corrigirValorDeclarar.mutationOptions()
  );

  const repararLancamentosMutation = useMutation(
    trpc.financeiro.repararLancamentos.mutationOptions()
  );

  const backfillVendasMutation = useMutation(
    trpc.financeiro.backfillVendas.mutationOptions()
  );

  const backfillDespesasMutation = useMutation(
    trpc.financeiro.backfillDespesas.mutationOptions()
  );

  async function handleSyncLancamentos() {
    setSyncing(true);
    try {
      // 0. Corrigir valorDeclarar de consignações (margem em vez de repasse)
      const resultCorrecao = await corrigirValorDeclaraMutation.mutateAsync();

      // 1. Reparar lançamentos com valores divergentes
      const resultReparo = await repararLancamentosMutation.mutateAsync();

      // 2. Backfill vendas sem lançamentos
      const resultVendas = await backfillVendasMutation.mutateAsync();

      // 3. Backfill despesas recorrentes (fev/2026 em diante)
      const now = new Date();
      const resultDespesas = await backfillDespesasMutation.mutateAsync({
        mesInicio: 2,
        anoInicio: 2026,
        mesFim: now.getMonth() + 1,
        anoFim: now.getFullYear(),
      });

      // Montar mensagem de resultado
      const partes: string[] = [];
      if (resultCorrecao.corrigidas > 0) {
        partes.push(`${resultCorrecao.corrigidas} valorDeclarar corrigido(s)`);
      }
      if (resultReparo.reparadas > 0) {
        partes.push(`${resultReparo.reparadas} lançamento(s) reparado(s)`);
      }
      if (resultVendas.processadas > 0) {
        partes.push(`${resultVendas.processadas} venda(s) processada(s)`);
      }
      if (resultVendas.erros > 0) {
        partes.push(`${resultVendas.erros} erro(s) em vendas`);
      }
      if (resultDespesas.mesesProcessados > 0) {
        partes.push(
          `${resultDespesas.mesesProcessados} mês(es) de despesas (${resultDespesas.totalLancamentos} lançamentos)`
        );
      }
      if (resultDespesas.mesesPulados > 0) {
        partes.push(`${resultDespesas.mesesPulados} mês(es) já processado(s)`);
      }

      if (partes.length === 0) {
        toast.info("Nenhum lançamento pendente para sincronizar");
      } else {
        toast.success(`Sincronização concluída: ${partes.join(", ")}`);
      }

      if (resultVendas.detalhesErros.length > 0) {
        toast.error(`Erros: ${resultVendas.detalhesErros.join("; ")}`);
      }

      // Invalidar queries do financeiro para atualizar dashboard
      queryClient.invalidateQueries({ queryKey: [["financeiro"]] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao sincronizar lançamentos"
      );
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Erro ao carregar dashboard financeiro
      </div>
    );
  }

  const dre = dashboard.dreMesAtual;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">
            Visão rápida da saúde financeira da Mr. Chrono
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleSyncLancamentos}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {syncing ? "Sincronizando..." : "Sincronizar Lançamentos"}
        </Button>
      </div>

      {/* Saldo de Caixa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Total em Caixa</p>
                <p className={cn("text-2xl font-bold", dashboard.saldoTotalCaixa < 0 && "text-red-600")}>
                  {formatCurrency(dashboard.saldoTotalCaixa)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(dashboard.saldosCaixa as Array<{ nome: string; saldo: number }>).map((conta) => (
          <Card key={conta.nome}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{conta.nome}</p>
                  <p className={cn("text-xl font-bold", conta.saldo < 0 && "text-red-600")}>
                    {formatCurrency(conta.saldo)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPIs do mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Receita Líquida (mês)</p>
            </div>
            <p className="text-xl font-bold">{formatCurrency(dre?.receitaLiquida ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Lucro Líquido (mês)</p>
            </div>
            <p className={cn("text-xl font-bold", (dre?.lucroLiquido ?? 0) < 0 && "text-red-600")}>
              {formatCurrency(dre?.lucroLiquido ?? 0)}
            </p>
            {dre && (
              <p className="text-xs text-muted-foreground">
                Margem {formatPercent(dre.margemLiquida)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">Recebíveis Pendentes</p>
            </div>
            <p className="text-xl font-bold">{formatCurrency(dashboard.totalRecebiveis)}</p>
            <p className="text-xs text-muted-foreground">{dashboard.vendasPendentes} vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4 text-violet-600" />
              <p className="text-xs text-muted-foreground">Alíquota Simples</p>
            </div>
            <p className="text-xl font-bold">
              {formatPercent(dashboard.aliquotaSimples * 100)}
            </p>
            <p className="text-xs text-muted-foreground">
              RBT12: {formatCurrency(dashboard.rbt12)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {dashboard.totalRepassesPendentes > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Repasses pendentes</p>
              <p className="text-sm text-amber-600">
                {formatCurrency(dashboard.totalRepassesPendentes)} em repasses de consignação aguardando pagamento
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DRE resumo do mês */}
      {dre && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo DRE — Mês Atual</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Receita Bruta", valor: dre.receitaBruta },
                  { label: "(−) Deduções", valor: -dre.deducoes },
                  { label: "= Receita Líquida", valor: dre.receitaLiquida, bold: true },
                  { label: "(−) CMV", valor: -dre.cmv },
                  { label: "= Lucro Bruto", valor: dre.lucroBruto, bold: true, pct: dre.margemBruta },
                  { label: "(−) Despesas Operacionais", valor: -dre.despesasOperacionais },
                  { label: "(−) Despesas Financeiras", valor: -dre.despesasFinanceiras },
                  { label: "= Lucro Operacional (EBIT)", valor: dre.lucroOperacional, bold: true },
                  { label: "(−) One-offs", valor: -dre.despesasNaoRecorrentes },
                  { label: "= Lucro Líquido", valor: dre.lucroLiquido, bold: true, pct: dre.margemLiquida },
                ].map((row) => (
                  <tr
                    key={row.label}
                    className={cn("border-b border-border/50", row.bold && "bg-muted/30")}
                  >
                    <td className={cn("py-1.5 px-4", row.bold && "font-semibold")}>
                      {row.label}
                    </td>
                    <td
                      className={cn(
                        "text-right py-1.5 px-4 font-mono tabular-nums",
                        row.bold && "font-semibold",
                        row.valor < 0 && "text-red-600"
                      )}
                    >
                      {formatCurrency(row.valor)}
                    </td>
                    <td className="text-right py-1.5 px-4 font-mono text-xs text-muted-foreground w-20">
                      {row.pct !== undefined ? formatPercent(row.pct) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Evolução mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Mensal (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-4 font-medium">Período</th>
                <th className="text-right py-2 px-4 font-medium">Receita Líquida</th>
                <th className="text-right py-2 px-4 font-medium">Lucro Líquido</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard.evolucao as Array<{ label: string; receitaLiquida: number; lucroLiquido: number }>).map((ev) => (
                <tr key={ev.label} className="border-b border-border/50">
                  <td className="py-1.5 px-4 font-medium">{ev.label}</td>
                  <td className="text-right py-1.5 px-4 font-mono tabular-nums">
                    {ev.receitaLiquida > 0 ? formatCurrency(ev.receitaLiquida) : "—"}
                  </td>
                  <td
                    className={cn(
                      "text-right py-1.5 px-4 font-mono tabular-nums",
                      ev.lucroLiquido < 0 && "text-red-600"
                    )}
                  >
                    {ev.lucroLiquido !== 0 ? formatCurrency(ev.lucroLiquido) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
