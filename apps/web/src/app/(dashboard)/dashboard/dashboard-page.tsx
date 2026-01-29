"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
  Truck,
  Wrench,
  CheckCircle,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores } = usePermissions();

  // Buscar metricas
  const { data: metricas, isLoading: isLoadingMetricas } = useQuery(
    trpc.dashboard.getMetricas.queryOptions()
  );

  // Buscar evolucao de vendas
  const { data: evolucaoVendas, isLoading: isLoadingEvolucao } = useQuery(
    trpc.dashboard.getEvolucaoVendas.queryOptions()
  );

  // Buscar pecas recentes
  const { data: pecasRecentes } = useQuery(
    trpc.dashboard.getPecasRecentes.queryOptions()
  );

  // Buscar vendas recentes
  const { data: vendasRecentes } = useQuery(
    trpc.dashboard.getVendasRecentes.queryOptions()
  );

  // Buscar pecas em revisao
  const { data: pecasEmRevisao } = useQuery(
    trpc.dashboard.getPecasEmRevisao.queryOptions()
  );

  // Buscar recebiveis pendentes
  const { data: recebiveis } = useQuery(
    trpc.dashboard.getRecebiveisPendentes.queryOptions()
  );

  // Verificar alertas automaticamente
  const verificarAlertasMutation = useMutation({
    ...trpc.alerta.verificarAlertas.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerta"] });
    },
  });

  // Verificar alertas ao carregar a pagina
  useEffect(() => {
    verificarAlertasMutation.mutate();
  }, []);

  if (isLoadingMetricas) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Titulo */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral do seu negocio
        </p>
      </div>

      {/* Alerta de estoque baixo */}
      {metricas?.estoque.abaixoIdeal && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-800">Estoque Abaixo do Ideal</p>
              <p className="text-sm text-amber-700">
                Voce tem {metricas.estoque.emEstoque} pecas em estoque. O ideal e ter pelo menos{" "}
                {metricas.estoque.estoqueIdeal} pecas.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={() => router.push("/estoque/novo")}
            >
              Cadastrar Peca
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cards de metricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estoque */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push("/estoque")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pecas em Estoque
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas?.estoque.emEstoque ?? 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {metricas?.estoque.disponivel ?? 0} disponivel
              </span>
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {metricas?.estoque.emTransito ?? 0} transito
              </span>
              <span className="text-xs text-orange-600 flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {metricas?.estoque.emRevisao ?? 0} revisao
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Vendas do mes */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push("/vendas")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas do Mes
            </CardTitle>
            {metricas?.vendas.variacao !== undefined && metricas.vendas.variacao >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas?.vendas.mes ?? 0}</div>
            <p
              className={cn(
                "text-xs",
                (metricas?.vendas.variacao ?? 0) >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {(metricas?.vendas.variacao ?? 0) >= 0 ? "+" : ""}
              {metricas?.vendas.variacao ?? 0}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        {/* Faturamento (apenas para quem pode ver valores) */}
        {podeVerValores && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faturamento do Mes
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas?.financeiro
                  ? formatCurrency(metricas.financeiro.faturamentoMes)
                  : "-"}
              </div>
              <p
                className={cn(
                  "text-xs",
                  (metricas?.financeiro?.variacaoFaturamento ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {(metricas?.financeiro?.variacaoFaturamento ?? 0) >= 0 ? "+" : ""}
                {metricas?.financeiro?.variacaoFaturamento ?? 0}% vs mes anterior
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recebiveis (apenas para quem pode ver valores) */}
        {podeVerValores && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A Receber
              </CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {metricas?.financeiro
                  ? formatCurrency(metricas.financeiro.recebiveis)
                  : "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                Repasses pendentes:{" "}
                {metricas?.financeiro
                  ? formatCurrency(metricas.financeiro.repassesPendentes)
                  : "-"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Se funcionario, mostrar cards adicionais */}
        {!podeVerValores && (
          <>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push("/clientes")}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Clientes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas?.vendas.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">vendas totais</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Em Revisao
                </CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas?.estoque.emRevisao ?? 0}</div>
                <p className="text-xs text-muted-foreground">pecas no relojoeiro</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Segunda linha: Grafico e cards */}
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
              <span className="text-sm">Estoque Atual</span>
              <span className="font-bold">{metricas?.estoque.emEstoque ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Estoque Ideal</span>
              <span className="font-bold">{metricas?.estoque.estoqueIdeal ?? 0}</span>
            </div>

            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    metricas?.estoque.abaixoIdeal
                      ? "bg-amber-500"
                      : "bg-green-500"
                  )}
                  style={{
                    width: `${Math.min(
                      ((metricas?.estoque.emEstoque ?? 0) /
                        (metricas?.estoque.estoqueIdeal || 1)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p
                className={cn(
                  "text-xs text-center",
                  metricas?.estoque.abaixoIdeal
                    ? "text-amber-600"
                    : "text-green-600"
                )}
              >
                {metricas?.estoque.abaixoIdeal
                  ? `Faltam ${(metricas?.estoque.estoqueIdeal ?? 0) - (metricas?.estoque.emEstoque ?? 0)} pecas`
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
                <span>{metricas?.estoque.disponivel ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  Em Transito
                </span>
                <span>{metricas?.estoque.emTransito ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Em Revisao
                </span>
                <span>{metricas?.estoque.emRevisao ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terceira linha: Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vendas Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/vendas")}>
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {!vendasRecentes || vendasRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma venda registrada
              </p>
            ) : (
              <div className="space-y-3">
                {vendasRecentes.map((venda) => (
                  <div
                    key={venda.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/vendas/${venda.id}`)}
                  >
                    <div>
                      <p className="font-mono text-sm">{venda.peca.sku}</p>
                      <p className="text-xs text-muted-foreground">
                        {venda.cliente.nome}
                      </p>
                    </div>
                    <div className="text-right">
                      {podeVerValores && venda.valorFinal && (
                        <p className="font-medium">
                          {formatCurrency(Number(venda.valorFinal))}
                        </p>
                      )}
                      <StatusBadge
                        type="pagamento"
                        status={venda.statusPagamento}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pecas em revisao */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pecas em Revisao</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/estoque?status=REVISAO")}
            >
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {!pecasEmRevisao || pecasEmRevisao.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma peca em revisao
              </p>
            ) : (
              <div className="space-y-3">
                {pecasEmRevisao.map((peca) => (
                  <div
                    key={peca.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer",
                      peca.atrasado
                        ? "border-orange-200 bg-orange-50 hover:bg-orange-100"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => router.push(`/estoque/${peca.id}`)}
                  >
                    <div>
                      <p className="font-mono text-sm">{peca.sku}</p>
                      <p className="text-xs text-muted-foreground">
                        {peca.marca} {peca.modelo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-medium flex items-center gap-1",
                          peca.atrasado ? "text-orange-600" : ""
                        )}
                      >
                        {peca.atrasado && <Clock className="h-3 w-3" />}
                        {peca.diasEmRevisao} dias
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {peca.localizacao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recebiveis pendentes (apenas para quem pode ver valores) */}
      {podeVerValores && recebiveis && recebiveis.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recebiveis Pendentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/vendas?statusPagamento=NAO_PAGO")}>
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium">SKU</th>
                    <th className="text-left py-2 text-sm font-medium">Cliente</th>
                    <th className="text-right py-2 text-sm font-medium">Total</th>
                    <th className="text-right py-2 text-sm font-medium">Pago</th>
                    <th className="text-right py-2 text-sm font-medium">Saldo</th>
                    <th className="text-center py-2 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recebiveis.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/vendas/${item.id}`)}
                    >
                      <td className="py-2 font-mono text-sm">{item.sku}</td>
                      <td className="py-2 text-sm">{item.cliente}</td>
                      <td className="py-2 text-sm text-right">
                        {formatCurrency(item.valorTotal)}
                      </td>
                      <td className="py-2 text-sm text-right">
                        {formatCurrency(item.totalPago)}
                      </td>
                      <td className="py-2 text-sm text-right font-medium text-amber-600">
                        {formatCurrency(item.saldoDevedor)}
                      </td>
                      <td className="py-2 text-center">
                        <StatusBadge
                          type="pagamento"
                          status={item.statusPagamento}
                          size="sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
