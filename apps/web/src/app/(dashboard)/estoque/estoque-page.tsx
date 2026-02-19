"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Archive, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PecasTable } from "@/components/tables/pecas-table";
import type { ColumnFilters, ColumnFilterCallbacks, PecaPgtoInfo } from "@/components/tables/pecas-table";
import { StatusDialog } from "@/components/dialogs/status-dialog";
import { LocationDialog } from "@/components/dialogs/location-dialog";
import { PagamentoFornecedorDialog } from "@/components/dialogs/pagamento-fornecedor-dialog";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

interface SelectedPeca {
  id: string;
  sku: string;
  status: string;
  localizacao: string;
}

// Labels for active filter badges
const STATUS_LABELS: Record<string, string> = {
  DISPONIVEL: "Disponivel",
  EM_TRANSITO: "Em Transito",
  REVISAO: "Em Revisao",
  VENDIDA: "Vendida",
  DEFEITO: "Defeito",
  PERDA: "Perda",
};

const ORIGEM_LABELS: Record<string, string> = {
  COMPRA: "Compra",
  CONSIGNACAO: "Consignacao",
};

const PGTO_LABELS: Record<string, string> = {
  PAGO: "Pago",
  PARCIAL: "Parcial",
  NAO_PAGO: "Nao Pago",
};

export function EstoquePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores, podeExcluir } = usePermissions();

  // Global search
  const [search, setSearch] = useState("");
  const [arquivado, setArquivado] = useState(false);
  const [page, setPage] = useState(1);

  // Column filters
  const [sku, setSku] = useState("");
  const [marca, setMarca] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [origemTipo, setOrigemTipo] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [localizacao, setLocalizacao] = useState<string | undefined>();
  const [statusPgtoFornecedor, setStatusPgtoFornecedor] = useState<string | undefined>();
  const [valorMin, setValorMin] = useState<number | undefined>();
  const [valorMax, setValorMax] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  // Status dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<SelectedPeca | null>(null);

  // Location dialog
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedLocationPeca, setSelectedLocationPeca] = useState<SelectedPeca | null>(null);

  // Pgto fornecedor dialog
  const [pgtoDialogOpen, setPgtoDialogOpen] = useState(false);
  const [selectedPgto, setSelectedPgto] = useState<PecaPgtoInfo | null>(null);

  // Revisada dialog
  const [revisadaDialogOpen, setRevisadaDialogOpen] = useState(false);
  const [selectedRevisada, setSelectedRevisada] = useState<{ id: string; sku: string; revisada: boolean } | null>(null);

  const { data, isLoading } = useQuery(
    trpc.peca.list.queryOptions({
      page,
      limit: 20,
      search: search || undefined,
      sku: sku || undefined,
      marca: marca || undefined,
      fornecedor: fornecedor || undefined,
      origemTipo: origemTipo as "COMPRA" | "CONSIGNACAO" | undefined,
      status: status as "DISPONIVEL" | "EM_TRANSITO" | "REVISAO" | "VENDIDA" | "DEFEITO" | "PERDA" | undefined,
      localizacao: localizacao || undefined,
      statusPagamentoFornecedor: statusPgtoFornecedor as "PAGO" | "PARCIAL" | "NAO_PAGO" | undefined,
      valorMin,
      valorMax,
      sortBy: sortBy as "createdAt" | "valorEstimadoVenda" | "lucroBruto",
      sortDir: sortDir as "asc" | "desc",
      arquivado,
    })
  );

  const { data: metricas } = useQuery(trpc.peca.getMetricas.queryOptions());
  const { data: localizacoes } = useQuery(trpc.peca.getLocalizacoes.queryOptions());

  const limparFiltros = () => {
    setSearch("");
    setSku("");
    setMarca("");
    setFornecedor("");
    setOrigemTipo(undefined);
    setStatus(undefined);
    setLocalizacao(undefined);
    setStatusPgtoFornecedor(undefined);
    setValorMin(undefined);
    setValorMax(undefined);
    setSortBy("createdAt");
    setSortDir("desc");
    setArquivado(false);
    setPage(1);
  };

  const temFiltros = search || sku || marca || fornecedor || origemTipo || status ||
    localizacao || statusPgtoFornecedor || valorMin !== undefined || valorMax !== undefined ||
    sortBy !== "createdAt" || arquivado;

  // Build active filter badges
  const activeFilterBadges: { key: string; label: string; value: string; onClear: () => void }[] = [];

  if (sku) activeFilterBadges.push({ key: "sku", label: "SKU", value: sku, onClear: () => { setSku(""); setPage(1); } });
  if (marca) activeFilterBadges.push({ key: "marca", label: "Marca/Modelo", value: marca, onClear: () => { setMarca(""); setPage(1); } });
  if (fornecedor) activeFilterBadges.push({ key: "fornecedor", label: "Fornecedor", value: fornecedor, onClear: () => { setFornecedor(""); setPage(1); } });
  if (origemTipo) activeFilterBadges.push({ key: "origem", label: "Origem", value: ORIGEM_LABELS[origemTipo] || origemTipo, onClear: () => { setOrigemTipo(undefined); setPage(1); } });
  if (status) activeFilterBadges.push({ key: "status", label: "Status", value: STATUS_LABELS[status] || status, onClear: () => { setStatus(undefined); setPage(1); } });
  if (localizacao) activeFilterBadges.push({ key: "loc", label: "Local", value: localizacao, onClear: () => { setLocalizacao(undefined); setPage(1); } });
  if (statusPgtoFornecedor) activeFilterBadges.push({ key: "pgto", label: "Pgto. Fornecedor", value: PGTO_LABELS[statusPgtoFornecedor] || statusPgtoFornecedor, onClear: () => { setStatusPgtoFornecedor(undefined); setPage(1); } });
  if (valorMin !== undefined || valorMax !== undefined) {
    const parts = [];
    if (valorMin !== undefined) parts.push(`Min R$ ${valorMin}`);
    if (valorMax !== undefined) parts.push(`Max R$ ${valorMax}`);
    activeFilterBadges.push({ key: "valor", label: "Valor", value: parts.join(" - "), onClear: () => { setValorMin(undefined); setValorMax(undefined); setPage(1); } });
  }
  if (sortBy !== "createdAt") {
    const sortLabel = sortBy === "lucroBruto" ? "Lucro Bruto" : "Valor";
    const dirLabel = sortDir === "asc" ? "Menor-Maior" : "Maior-Menor";
    activeFilterBadges.push({ key: "sort", label: "Ordem", value: `${sortLabel} ${dirLabel}`, onClear: () => { setSortBy("createdAt"); setSortDir("desc"); setPage(1); } });
  }

  const handleStatusClick = (peca: SelectedPeca) => {
    setSelectedPeca(peca);
    setStatusDialogOpen(true);
  };

  const handleStatusSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
    queryClient.invalidateQueries({ queryKey: ["peca", "getMetricas"] });
  };

  const handleLocationClick = (peca: SelectedPeca) => {
    setSelectedLocationPeca(peca);
    setLocationDialogOpen(true);
  };

  const handleLocationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
  };

  const handlePgtoClick = (info: PecaPgtoInfo) => {
    setSelectedPgto(info);
    setPgtoDialogOpen(true);
  };

  const handlePgtoSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
  };

  const handleRevisadaClick = (peca: { id: string; sku: string; revisada: boolean }) => {
    setSelectedRevisada(peca);
    setRevisadaDialogOpen(true);
  };

  const toggleRevisadaMutation = useMutation(trpc.peca.toggleRevisada.mutationOptions());

  const handleToggleRevisada = (revisada: boolean) => {
    if (!selectedRevisada) return;
    toggleRevisadaMutation.mutate(
      { id: selectedRevisada.id, revisada },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
          setRevisadaDialogOpen(false);
        },
        onError: () => {
          toast.error("Erro ao atualizar revisao");
        },
      }
    );
  };

  const deleteMutation = useMutation(trpc.peca.delete.mutationOptions());
  const toggleCatalogoMutation = useMutation(trpc.peca.toggleCatalogo.mutationOptions());

  const handleToggleCatalogo = (id: string, exibir: boolean) => {
    toggleCatalogoMutation.mutate(
      { id, exibirNoCatalogo: exibir },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
        },
        onError: () => {
          toast.error("Erro ao atualizar visibilidade no catalogo");
        },
      }
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Peca excluida com sucesso");
      queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
      queryClient.invalidateQueries({ queryKey: ["peca", "getMetricas"] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir peca";
      toast.error(message);
      throw error;
    }
  };

  // Column filter values and callbacks for PecasTable
  const filters: ColumnFilters = {
    sku,
    marca,
    fornecedor,
    origemTipo,
    status,
    localizacao,
    statusPagamentoFornecedor: statusPgtoFornecedor,
    valorMin,
    valorMax,
    sortBy,
    sortDir,
  };

  const filterCallbacks: ColumnFilterCallbacks = {
    onSkuChange: (v) => { setSku(v); setPage(1); },
    onMarcaChange: (v) => { setMarca(v); setPage(1); },
    onFornecedorChange: (v) => { setFornecedor(v); setPage(1); },
    onOrigemTipoChange: (v) => { setOrigemTipo(v); setPage(1); },
    onStatusChange: (v) => { setStatus(v); setPage(1); },
    onLocalizacaoChange: (v) => { setLocalizacao(v); setPage(1); },
    onStatusPgtoChange: (v) => { setStatusPgtoFornecedor(v); setPage(1); },
    onValorRangeChange: (min, max) => { setValorMin(min); setValorMax(max); setPage(1); },
    onSortChange: (sb, sd) => { setSortBy(sb); setSortDir(sd); setPage(1); },
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

      {/* Header */}
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

      {/* Search bar + Arquivadas + Limpar */}
      <div className="flex gap-4 flex-wrap items-center">
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
        <Button
          variant={arquivado ? "default" : "outline"}
          onClick={() => {
            setArquivado(!arquivado);
            setPage(1);
          }}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          Arquivadas
        </Button>
        {temFiltros && (
          <Button variant="ghost" onClick={limparFiltros}>
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilterBadges.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {activeFilterBadges.map((badge) => (
            <Badge
              key={badge.key}
              variant="secondary"
              className="gap-1.5 px-3 py-1 text-sm font-normal"
            >
              <span className="text-muted-foreground">{badge.label}:</span>
              <span className="font-medium">{badge.value}</span>
              <button
                type="button"
                onClick={badge.onClear}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Tabela */}
      <PecasTable
        pecas={data?.pecas ?? []}
        isLoading={isLoading}
        podeVerValores={podeVerValores}
        podeExcluir={podeExcluir}
        onView={(id) => router.push(`/estoque/${id}` as Route)}
        onStatusClick={handleStatusClick}
        onLocationClick={handleLocationClick}
        onDelete={handleDelete}
        onToggleCatalogo={handleToggleCatalogo}
        onPgtoClick={podeVerValores ? handlePgtoClick : undefined}
        onRevisadaClick={handleRevisadaClick}
        filters={filters}
        filterCallbacks={filterCallbacks}
        localizacoes={localizacoes ?? []}
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

      {/* Dialog de alteracao de localizacao */}
      {selectedLocationPeca && (
        <LocationDialog
          open={locationDialogOpen}
          onOpenChange={setLocationDialogOpen}
          pecaId={selectedLocationPeca.id}
          currentStatus={selectedLocationPeca.status}
          currentLocalizacao={selectedLocationPeca.localizacao}
          onSuccess={handleLocationSuccess}
        />
      )}

      {/* Dialog de pagamento ao fornecedor */}
      {selectedPgto && (
        <PagamentoFornecedorDialog
          open={pgtoDialogOpen}
          onOpenChange={setPgtoDialogOpen}
          pecaId={selectedPgto.id}
          sku={selectedPgto.sku}
          valorCompra={selectedPgto.valorCompra}
          valorPago={selectedPgto.valorPago}
          origemTipo={selectedPgto.origemTipo as "COMPRA" | "CONSIGNACAO"}
          statusPeca={selectedPgto.status}
          onSuccess={handlePgtoSuccess}
        />
      )}

      {/* Dialog de revisao */}
      <Dialog open={revisadaDialogOpen} onOpenChange={setRevisadaDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Revisao — {selectedRevisada?.sku}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta peca foi revisada?
          </p>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button
              variant={selectedRevisada?.revisada ? "outline" : "default"}
              onClick={() => handleToggleRevisada(true)}
              disabled={toggleRevisadaMutation.isPending}
            >
              Sim
            </Button>
            <Button
              variant={!selectedRevisada?.revisada ? "outline" : "default"}
              onClick={() => handleToggleRevisada(false)}
              disabled={toggleRevisadaMutation.isPending}
            >
              Nao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
