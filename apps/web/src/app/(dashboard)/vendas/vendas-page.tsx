"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VendasTable } from "@/components/tables/vendas-table";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters";

export function VendasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores, podeCancelarVenda } = usePermissions();

  const [search, setSearch] = useState("");
  const [statusPagamento, setStatusPagamento] = useState<string | undefined>();
  const [statusRepasse, setStatusRepasse] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(
    trpc.venda.list.queryOptions({
      page,
      limit: 20,
      search: search || undefined,
      statusPagamento: statusPagamento as "PAGO" | "PARCIAL" | "NAO_PAGO" | undefined,
      statusRepasse: statusRepasse as "FEITO" | "PARCIAL" | "PENDENTE" | undefined,
    })
  );

  const { data: metricas } = useQuery(trpc.venda.getMetricas.queryOptions());
  const { data: recebiveis } = useQuery(trpc.venda.getRecebiveis.queryOptions());

  const limparFiltros = () => {
    setSearch("");
    setStatusPagamento(undefined);
    setStatusRepasse(undefined);
    setPage(1);
  };

  const temFiltros = search || statusPagamento || statusRepasse;

  const cancelMutation = useMutation(trpc.venda.cancel.mutationOptions());

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync({ vendaId: id });
      toast.success("Venda cancelada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["venda", "list"] });
      queryClient.invalidateQueries({ queryKey: ["venda", "getMetricas"] });
      queryClient.invalidateQueries({ queryKey: ["venda", "getRecebiveis"] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao cancelar venda";
      toast.error(message);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas do Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas?.vendasMes ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas?.totalVendas ?? 0}</div>
          </CardContent>
        </Card>

        {podeVerValores && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faturamento do Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricas?.faturamentoMes
                    ? formatCurrency(metricas.faturamentoMes)
                    : "-"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  A Receber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {recebiveis?.totalRecebiveis
                    ? formatCurrency(recebiveis.totalRecebiveis)
                    : "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {recebiveis?.vendasPendentes ?? 0} vendas pendentes
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Header e filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} venda(s) registrada(s)
          </p>
        </div>
        <Button onClick={() => router.push("/vendas/nova")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Venda
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU ou cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusPagamento || "all"}
          onValueChange={(value) => {
            setStatusPagamento(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PAGO">Pago</SelectItem>
            <SelectItem value="PARCIAL">Parcial</SelectItem>
            <SelectItem value="NAO_PAGO">Nao Pago</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusRepasse || "all"}
          onValueChange={(value) => {
            setStatusRepasse(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Repasse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="FEITO">Feito</SelectItem>
            <SelectItem value="PARCIAL">Parcial</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
          </SelectContent>
        </Select>
        {temFiltros && (
          <Button variant="ghost" onClick={limparFiltros}>
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Tabela */}
      <VendasTable
        vendas={data?.vendas ?? []}
        isLoading={isLoading}
        podeVerValores={podeVerValores}
        podeExcluir={podeCancelarVenda}
        onView={(id) => router.push(`/vendas/${id}`)}
        onEdit={(id) => router.push(`/vendas/${id}/editar`)}
        onDelete={handleCancel}
      />

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
  );
}
