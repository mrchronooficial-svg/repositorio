"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PecasTable } from "@/components/tables/pecas-table";
import { StatusDialog } from "@/components/dialogs/status-dialog";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters";

interface SelectedPeca {
  id: string;
  sku: string;
  status: string;
  localizacao: string;
}

export function EstoquePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores } = usePermissions();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [localizacao, setLocalizacao] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  // Estado para o modal de status
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<SelectedPeca | null>(null);

  const { data, isLoading } = useQuery(
    trpc.peca.list.queryOptions({
      page,
      limit: 20,
      search: search || undefined,
      status: status as "DISPONIVEL" | "EM_TRANSITO" | "REVISAO" | "VENDIDA" | "DEFEITO" | "PERDA" | undefined,
      localizacao: localizacao || undefined,
    })
  );

  const { data: metricas } = useQuery(trpc.peca.getMetricas.queryOptions());
  const { data: localizacoes } = useQuery(trpc.peca.getLocalizacoes.queryOptions());

  const limparFiltros = () => {
    setSearch("");
    setStatus(undefined);
    setLocalizacao(undefined);
    setPage(1);
  };

  const temFiltros = search || status || localizacao;

  const handleStatusClick = (peca: SelectedPeca) => {
    setSelectedPeca(peca);
    setStatusDialogOpen(true);
  };

  const handleStatusSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
    queryClient.invalidateQueries({ queryKey: ["peca", "getMetricas"] });
  };

  return (
    <div className="space-y-6">
      {/* Metricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas?.emEstoque ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Ideal: {metricas?.estoqueIdeal ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disponiveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricas?.statusCount?.DISPONIVEL ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Revisao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricas?.statusCount?.REVISAO ?? 0}
            </div>
          </CardContent>
        </Card>

        {podeVerValores && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas?.valorTotalEstoque
                  ? formatCurrency(metricas.valorTotalEstoque)
                  : "-"}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Header e filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} peca(s) cadastrada(s)
          </p>
        </div>
        <Button onClick={() => router.push("/estoque/novo")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Peca
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU, marca ou modelo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status || "all"}
          onValueChange={(value) => {
            setStatus(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="DISPONIVEL">Disponivel</SelectItem>
            <SelectItem value="EM_TRANSITO">Em Transito</SelectItem>
            <SelectItem value="REVISAO">Em Revisao</SelectItem>
            <SelectItem value="VENDIDA">Vendida</SelectItem>
            <SelectItem value="DEFEITO">Defeito</SelectItem>
            <SelectItem value="PERDA">Perda</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={localizacao || "all"}
          onValueChange={(value) => {
            setLocalizacao(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Localizacao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {localizacoes?.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
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
      <PecasTable
        pecas={data?.pecas ?? []}
        isLoading={isLoading}
        podeVerValores={podeVerValores}
        onView={(id) => router.push(`/estoque/${id}`)}
        onStatusClick={handleStatusClick}
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

      {/* Dialog de alteracao de status */}
      {selectedPeca && (
        <StatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          pecaId={selectedPeca.id}
          currentStatus={selectedPeca.status}
          currentLocalizacao={selectedPeca.localizacao}
          onSuccess={handleStatusSuccess}
        />
      )}
    </div>
  );
}
