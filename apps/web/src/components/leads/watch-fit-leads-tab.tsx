"use client";

import { useMemo, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  X,
  Copy,
  Archive,
  Check as CheckIcon,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/utils/trpc";
import { MARCAS } from "@/components/watch-fit/constants";
import { STATUS_LIST, type StatusLead, type TipoBuscaLead } from "@/components/leads/constants";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadDetailSheet } from "@/components/leads/lead-detail-sheet";
import { StatusBadge } from "@/components/leads/status-badge";
import { MarcasMultiSelect } from "@/components/leads/marcas-multi-select";

const LEADS_PER_PAGE = 20;

export function WatchFitLeadsTab() {
  const queryClient = useQueryClient();

  // ---------- Filtros ----------
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusLead | "ALL">("ALL");
  const [tipoBusca, setTipoBusca] = useState<TipoBuscaLead | "ALL">("ALL");
  const [marcasInteresse, setMarcasInteresse] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);

  // ---------- Seleção múltipla ----------
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmArquivarLote, setConfirmArquivarLote] = useState(false);

  // ---------- Drawer de detalhe ----------
  const [detalheId, setDetalheId] = useState<string | null>(null);

  // ---------- Queries ----------
  const { data: stats } = useQuery(trpc.lead.stats.queryOptions());

  const listInput = useMemo(
    () => ({
      page,
      limit: LEADS_PER_PAGE,
      search: search.trim() || undefined,
      status: status === "ALL" ? undefined : status,
      tipoBusca: tipoBusca === "ALL" ? undefined : tipoBusca,
      marcasInteresse: marcasInteresse.length > 0 ? marcasInteresse : undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      incluirArquivados: status === "ARQUIVADO",
      sortBy: "createdAt" as const,
      sortDir: "desc" as const,
    }),
    [page, search, status, tipoBusca, marcasInteresse, dataInicio, dataFim],
  );

  const { data, isLoading, isFetching } = useQuery(
    trpc.lead.list.queryOptions(listInput),
  );

  // ---------- Mutations ----------
  const archiveMutation = useMutation(
    trpc.lead.archive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["lead", "list"]] });
        queryClient.invalidateQueries({ queryKey: [["lead", "stats"]] });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  // ---------- Helpers ----------
  const limparFiltros = () => {
    setSearch("");
    setStatus("ALL");
    setTipoBusca("ALL");
    setMarcasInteresse([]);
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  const temFiltros =
    search ||
    status !== "ALL" ||
    tipoBusca !== "ALL" ||
    marcasInteresse.length > 0 ||
    dataInicio ||
    dataFim;

  const leads = data?.leads ?? [];
  const todosSelecionados =
    leads.length > 0 && leads.every((l) => selecionados.has(l.id));

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    setSelecionados((prev) => {
      if (todosSelecionados) {
        const next = new Set(prev);
        leads.forEach((l) => next.delete(l.id));
        return next;
      }
      const next = new Set(prev);
      leads.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const limparSelecao = () => setSelecionados(new Set());

  const arquivarLote = async () => {
    const ids = Array.from(selecionados);
    try {
      await Promise.all(ids.map((id) => archiveMutation.mutateAsync({ id })));
      toast.success(`${ids.length} lead(s) arquivado(s)`);
      limparSelecao();
      setConfirmArquivarLote(false);
    } catch {
      // erros individuais já foram tratados pelo onError
    }
  };

  const copiarLinkFormulario = async () => {
    const url = `${window.location.origin}/watch-fit`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link do formulário copiado!");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* Cabeçalho da aba — botão de copiar link */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-muted-foreground">
          Gerencie os leads captados pelo formulário Watch Fit
        </p>
        <Button onClick={copiarLinkFormulario} variant="outline">
          <Copy className="w-4 h-4 mr-2" />
          Copiar link do formulário
        </Button>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total" value={stats?.total ?? 0} />
        <MetricCard
          label="Novos"
          value={stats?.novos ?? 0}
          accent="bg-sky-50 text-sky-800 border-sky-200"
        />
        <MetricCard label="Últimas 24h" value={stats?.novosUltimas24h ?? 0} />
        <MetricCard label="Últimos 7 dias" value={stats?.novosUltimos7Dias ?? 0} />
        <MetricCard label="Ativos" value={stats?.ativos ?? 0} />
      </div>

      {/* Barra de filtros */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as StatusLead | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {STATUS_LIST.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={tipoBusca}
          onValueChange={(v) => {
            setTipoBusca(v as TipoBuscaLead | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os tipos</SelectItem>
            <SelectItem value="ESPECIFICO">Encomenda</SelectItem>
            <SelectItem value="DESCOBERTA">Curadoria</SelectItem>
          </SelectContent>
        </Select>

        <MarcasMultiSelect
          options={MARCAS.filter((m) => m !== "Outra")}
          value={marcasInteresse}
          onChange={(next) => {
            setMarcasInteresse(next);
            setPage(1);
          }}
        />

        <div className="flex items-center gap-2">
          <div>
            <label className="text-[11px] uppercase text-muted-foreground block mb-1">
              De
            </label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setPage(1);
              }}
              className="w-36"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase text-muted-foreground block mb-1">
              Até
            </label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
                setPage(1);
              }}
              className="w-36"
            />
          </div>
        </div>

        {temFiltros && (
          <Button variant="ghost" onClick={limparFiltros}>
            <X className="w-4 h-4 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Barra de ações em lote */}
      {selecionados.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-md border bg-amber-50/60 border-amber-200">
          <div className="text-sm">
            <strong>{selecionados.size}</strong> lead(s) selecionado(s)
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmArquivarLote(true)}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-1.5" />
              )}
              Arquivar
            </Button>
            <Button size="sm" variant="ghost" onClick={limparSelecao}>
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Info de totais */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {data?.total ?? 0} lead(s){" "}
          {isFetching && !isLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
        </span>
        {status !== "ALL" && (
          <StatusBadge status={status as StatusLead} />
        )}
      </div>

      {/* Tabela */}
      <LeadsTable
        leads={leads}
        isLoading={isLoading}
        selecionados={selecionados}
        onToggleSelecionado={toggleSelecionado}
        onToggleTodos={toggleTodos}
        todosSelecionados={todosSelecionados}
        onRowClick={(id) => setDetalheId(id)}
      />

      {/* Paginação */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="py-2 px-4 text-sm">
            Página {page} de {data.pages}
          </span>
          <Button
            variant="outline"
            disabled={page === data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Drawer de detalhe */}
      <LeadDetailSheet
        leadId={detalheId}
        open={Boolean(detalheId)}
        onOpenChange={(open) => {
          if (!open) setDetalheId(null);
        }}
      />

      {/* Confirm dialog arquivar em lote */}
      <Dialog open={confirmArquivarLote} onOpenChange={setConfirmArquivarLote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar {selecionados.size} lead(s)?</DialogTitle>
            <DialogDescription>
              Os leads selecionados serão marcados como <strong>Arquivado</strong> e
              sairão da listagem padrão. Essa ação pode ser revertida alterando o
              status de cada lead individualmente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmArquivarLote(false)}>
              Cancelar
            </Button>
            <Button onClick={arquivarLote} disabled={archiveMutation.isPending}>
              {archiveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckIcon className="w-4 h-4 mr-1.5" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==============================
// Sub-componentes
// ==============================
function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card className={accent ? `border ${accent}` : ""}>
      <CardContent className="pt-5 pb-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {label}
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
