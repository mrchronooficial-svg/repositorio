"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Check,
  X,
  Search,
  Clock,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Send,
  FileDown,
  FileCode,
  Loader2,
  Ban,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EditarValorDeclarar } from "@/components/editar-valor-declarar";
import { usePermissions } from "@/hooks/use-permissions";
import { trpc } from "@/utils/trpc";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

type FiltroStatus =
  | "all"
  | "PENDENTE"
  | "PROCESSANDO"
  | "EMITIDA"
  | "ERRO"
  | "CANCELADA"
  | "DECLARADA_MANUAL";

type StatusNota =
  | "PROCESSANDO"
  | "EMITIDA"
  | "ERRO"
  | "CANCELAMENTO_PROCESSANDO"
  | "CANCELADA"
  | "FALHA_CANCELAMENTO";

interface NotaView {
  id: string;
  emissao: number;
  parte: number;
  totalPartes: number;
  valor: unknown;
  ativa: boolean;
  status: StatusNota;
  numero: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  mensagemErro: string | null;
}

// Mesma regra do servidor (enotas.service.ts > DATA_INICIO_EMISSAO): vendas anteriores a
// 01/11/2026 (horario de Brasilia) nunca sao emitidas pelo sistema.
const DATA_INICIO_EMISSAO_MS = Date.parse("2026-11-01T03:00:00.000Z");

const STATUS_NOTA: Record<StatusNota, { label: string; className: string }> = {
  PROCESSANDO: { label: "Processando", className: "bg-sky-50 text-sky-700 border-sky-200" },
  EMITIDA: { label: "Emitida", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ERRO: { label: "Erro", className: "bg-red-50 text-red-700 border-red-200" },
  CANCELAMENTO_PROCESSANDO: {
    label: "Cancelando",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CANCELADA: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border-gray-200" },
  FALHA_CANCELAMENTO: {
    label: "Falha ao cancelar",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

function BadgeStatus({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export default function NfePage() {
  const queryClient = useQueryClient();
  const { podeVerValores, isLoading: carregandoPermissoes } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusNfe, setStatusNfe] = useState<FiltroStatus>("all");
  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<{ url: string; sku: string } | null>(null);
  const [vendaEmAcao, setVendaEmAcao] = useState<string | null>(null);

  const queryOptions = trpc.nfe.list.queryOptions(
    {
      page,
      limit: 20,
      search: search || undefined,
      status: statusNfe !== "all" ? statusNfe : undefined,
    },
    { enabled: podeVerValores }
  );
  const { data, isLoading } = useQuery(queryOptions);

  const metricasOptions = trpc.nfe.getMetricas.queryOptions(undefined, {
    enabled: podeVerValores,
  });
  const { data: metricas } = useQuery(metricasOptions);

  const configOptions = trpc.nfe.getConfig.queryOptions(undefined, { enabled: podeVerValores });
  const { data: config } = useQuery(configOptions);

  const problemasKey = trpc.nfe.getProblemas.queryKey();

  function invalidarTudo() {
    queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    queryClient.invalidateQueries({ queryKey: metricasOptions.queryKey });
    queryClient.invalidateQueries({ queryKey: problemasKey });
  }

  const onErro = (error: { message: string }) => {
    toast.error(error.message);
    setVendaEmAcao(null);
  };

  const emitirMutation = useMutation(
    trpc.nfe.emitir.mutationOptions({
      onSuccess: (r) => {
        if (r.erros.length > 0) toast.error(`Erro ao enviar NF-e: ${r.erros[0]}`);
        else toast.success("NF-e enviada para emissao!");
        setVendaEmAcao(null);
        invalidarTudo();
      },
      onError: (error, vars) => {
        // Possivel nota duplicada (ja emitida pelo CSV): pedir confirmacao explicita
        if (error.data?.code === "CONFLICT" && !vars.ignorarDuplicidade) {
          const confirmar = window.confirm(
            `${error.message}\n\nSe a nota JA foi emitida, clique em Cancelar e use "Ja declarada".\n` +
              "Se for realmente outra venda, clique em OK para emitir mesmo assim."
          );
          if (confirmar) {
            emitirMutation.mutate({ vendaId: vars.vendaId, ignorarDuplicidade: true });
            return;
          }
          setVendaEmAcao(null);
          return;
        }
        onErro(error);
      },
    })
  );

  const reemitirMutation = useMutation(
    trpc.nfe.reemitir.mutationOptions({
      onSuccess: (r) => {
        if (r.cancelamento.falhas.length > 0) {
          toast.error("Nao foi possivel cancelar a nota anterior. A nova NAO foi emitida.");
        } else if (r.emissao.erros.length > 0) {
          toast.error(`Erro ao emitir a nova NF-e: ${r.emissao.erros[0]}`);
        } else {
          toast.success("Nota anterior cancelada e nova NF-e enviada!");
        }
        setVendaEmAcao(null);
        invalidarTudo();
      },
      onError: onErro,
    })
  );

  const cancelarNovamenteMutation = useMutation(
    trpc.nfe.tentarCancelarNovamente.mutationOptions({
      onSuccess: (r) => {
        if (r.falhas.length > 0) toast.error(`Cancelamento falhou de novo: ${r.falhas[0]}`);
        else toast.success("Cancelamento enviado ao eNotas!");
        setVendaEmAcao(null);
        invalidarTudo();
      },
      onError: onErro,
    })
  );

  const sincronizarMutation = useMutation(
    trpc.nfe.sincronizar.mutationOptions({
      onSuccess: (r) => {
        toast.success(
          r.consultadas > 0
            ? `${r.consultadas} nota(s) consultada(s) no eNotas`
            : "Nenhuma nota aguardando atualizacao"
        );
        invalidarTudo();
      },
      onError: onErro,
    })
  );

  const automaticaMutation = useMutation(
    trpc.nfe.setEmissaoAutomatica.mutationOptions({
      onSuccess: (_r, vars) => {
        toast.success(
          vars.ligada ? "Emissao automatica LIGADA" : "Emissao automatica DESLIGADA"
        );
        queryClient.invalidateQueries({ queryKey: configOptions.queryKey });
      },
      onError: onErro,
    })
  );

  const marcarDeclaradaMutation = useMutation(
    trpc.nfe.marcarDeclarada.mutationOptions({
      onSuccess: () => {
        toast.success("Venda marcada como declarada!");
        invalidarTudo();
      },
      onError: onErro,
    })
  );

  const desmarcarDeclaradaMutation = useMutation(
    trpc.nfe.desmarcarDeclarada.mutationOptions({
      onSuccess: () => {
        toast.success("Marcacao removida!");
        invalidarTudo();
      },
      onError: onErro,
    })
  );

  if (carregandoPermissoes) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!podeVerValores) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "NFe" }]} />
        <p className="text-muted-foreground">
          Apenas administradores e socios tem acesso a aba NFe.
        </p>
      </div>
    );
  }

  const configurado = config?.configurado ?? false;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "NFe" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NFe</h1>
          <p className="text-muted-foreground">
            Emissao de notas fiscais pelo eNotas
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => sincronizarMutation.mutate()}
          disabled={!configurado || sincronizarMutation.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${sincronizarMutation.isPending ? "animate-spin" : ""}`}
          />
          Atualizar status
        </Button>
      </div>

      {/* Integracao eNotas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-2.5 w-2.5 rounded-full ${configurado ? "bg-emerald-500" : "bg-red-500"}`}
              />
              <div>
                <p className="text-sm font-medium">
                  {configurado
                    ? "Integracao com o eNotas conectada"
                    : "Integracao com o eNotas nao configurada"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {configurado
                    ? "As notas sao enviadas ao eNotas e o status e atualizado a cada minuto."
                    : "Falta a API Key do eNotas nas configuracoes do servidor."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">Emissao automatica</p>
                <p className="text-xs text-muted-foreground">
                  Emite a NF-e quando a venda fica paga
                </p>
              </div>
              <Switch
                checked={config?.emissaoAutomatica ?? false}
                disabled={!configurado || automaticaMutation.isPending}
                onCheckedChange={(ligada) => automaticaMutation.mutate({ ligada })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de metricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metricas?.pendentes ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Vendas sem NF-e</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emitidas</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metricas?.declaradas ?? "-"}</div>
            <p className="text-xs text-muted-foreground">
              {metricas?.processando ? `${metricas.processando} em processamento` : "Vendas com NF-e"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com problema</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metricas?.comProblema ?? "-"}</div>
            <p className="text-xs text-muted-foreground">Erro na emissao ou no cancelamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metricas?.valorPendente !== undefined ? formatCurrency(metricas.valorPendente) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">Soma dos valores a declarar pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU ou cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusNfe}
              onValueChange={(value) => {
                setStatusNfe(value as FiltroStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="PROCESSANDO">Processando</SelectItem>
                <SelectItem value="EMITIDA">Emitida</SelectItem>
                <SelectItem value="ERRO">Com problema</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
                <SelectItem value="DECLARADA_MANUAL">Declarada manualmente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.vendas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma venda encontrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Foto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Valor a Declarar</TableHead>
                  <TableHead>NF-e</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.vendas.map((venda) => {
                  const notas = venda.notasFiscais as NotaView[];
                  const ativas = notas.filter((n) => n.ativa);
                  const temNotaViva = ativas.some(
                    (n) => n.status === "PROCESSANDO" || n.status === "EMITIDA"
                  );
                  const temErro = ativas.some((n) => n.status === "ERRO");
                  const temFalhaCancelamento = notas.some((n) => n.status === "FALHA_CANCELAMENTO");
                  const semNota = ativas.length === 0;
                  const valorDeclarar =
                    venda.valorDeclarar != null ? Number(venda.valorDeclarar) : null;
                  const somaAtivas = ativas.reduce((acc, n) => acc + Number(n.valor), 0);
                  const valorDivergente =
                    temNotaViva &&
                    valorDeclarar != null &&
                    Math.abs(somaAtivas - valorDeclarar) > 0.005;
                  const ocupada = vendaEmAcao === venda.id;
                  const permiteEmissao =
                    new Date(venda.dataVenda).getTime() >= DATA_INICIO_EMISSAO_MS;
                  // Notas a exibir: as ativas; em venda cancelada, as da ultima emissao
                  const notasExibir =
                    ativas.length > 0
                      ? ativas
                      : venda.cancelada
                        ? notas.filter((n) => n.emissao === notas[0]?.emissao)
                        : [];

                  return (
                    <TableRow key={venda.id} className={venda.cancelada ? "opacity-70" : ""}>
                      <TableCell className="py-2">
                        {venda.peca.fotos?.[0] ? (
                          <img
                            src={venda.peca.fotos[0].url}
                            alt={venda.peca.sku}
                            className="h-14 w-14 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() =>
                              setSelectedImage({
                                url: venda.peca.fotos[0]!.url,
                                sku: venda.peca.sku,
                              })
                            }
                            title="Clique para ampliar"
                          />
                        ) : (
                          <div className="h-14 w-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            Sem foto
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-medium">{venda.peca.sku}</div>
                        <div className="text-xs text-muted-foreground">
                          {venda.peca.marca} {venda.peca.modelo}
                        </div>
                        {venda.cancelada && (
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            Venda cancelada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{venda.cliente.nome}</div>
                        {venda.statusPagamento !== "PAGO" && !venda.cancelada && (
                          <div className="text-xs text-amber-600">
                            Pagamento {venda.statusPagamento === "PARCIAL" ? "parcial" : "pendente"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {venda.cancelada ? (
                          <span className="font-medium">
                            {valorDeclarar != null ? formatCurrency(valorDeclarar) : "-"}
                          </span>
                        ) : (
                          <EditarValorDeclarar
                            vendaId={venda.id}
                            valorDeclarar={valorDeclarar}
                            manual={venda.valorDeclararManual}
                            temNfe={temNotaViva}
                            queryKeys={[queryOptions.queryKey, metricasOptions.queryKey]}
                          />
                        )}
                        {valorDivergente && (
                          <div className="text-xs text-amber-600 mt-1">
                            NF-e emitida com {formatCurrency(somaAtivas)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {notasExibir.length === 0 ? (
                          venda.nfeDeclarada ? (
                            <BadgeStatus
                              label="Declarada (manual)"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200"
                            />
                          ) : (
                            <BadgeStatus
                              label="Pendente"
                              className="bg-orange-50 text-orange-700 border-orange-200"
                            />
                          )
                        ) : (
                          <div className="space-y-1.5">
                            {notasExibir.map((nota) => (
                              <div key={nota.id} className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <BadgeStatus {...STATUS_NOTA[nota.status]} />
                                  {nota.totalPartes > 1 && (
                                    <span className="text-xs text-muted-foreground">
                                      {nota.parte}/{nota.totalPartes} ·{" "}
                                      {formatCurrency(Number(nota.valor))}
                                    </span>
                                  )}
                                  {nota.numero && (
                                    <span className="text-xs text-muted-foreground">
                                      N&ordm; {nota.numero}
                                    </span>
                                  )}
                                </div>
                                {nota.mensagemErro &&
                                  (nota.status === "ERRO" ||
                                    nota.status === "FALHA_CANCELAMENTO") && (
                                    <p className="text-xs text-red-600 max-w-xs">
                                      {nota.mensagemErro}
                                    </p>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* Arquivos das notas emitidas */}
                          {notasExibir
                            .filter((n) => n.pdfUrl || n.xmlUrl)
                            .map((nota) => (
                              <div key={nota.id} className="flex gap-1">
                                {nota.pdfUrl && (
                                  <a
                                    href={nota.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonVariants({ variant: "outline", size: "sm" })}
                                  >
                                    <FileDown className="h-4 w-4 mr-1" />
                                    PDF{nota.totalPartes > 1 ? ` ${nota.parte}` : ""}
                                  </a>
                                )}
                                {nota.xmlUrl && (
                                  <a
                                    href={nota.xmlUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonVariants({ variant: "outline", size: "sm" })}
                                  >
                                    <FileCode className="h-4 w-4 mr-1" />
                                    XML{nota.totalPartes > 1 ? ` ${nota.parte}` : ""}
                                  </a>
                                )}
                              </div>
                            ))}

                          {!venda.cancelada &&
                            (semNota || temErro) &&
                            !venda.nfeDeclarada &&
                            !permiteEmissao && (
                              <span
                                className="text-xs text-muted-foreground"
                                title="Vendas anteriores a 01/11/2026 nao sao emitidas pelo sistema"
                              >
                                Anterior a nov/2026: emitir por fora
                              </span>
                            )}

                          {!venda.cancelada &&
                            (semNota || temErro) &&
                            !venda.nfeDeclarada &&
                            permiteEmissao &&
                            venda.statusPagamento !== "PAGO" && (
                              <span className="text-xs text-muted-foreground">
                                Emite quando a venda for paga
                              </span>
                            )}

                          {!venda.cancelada &&
                            (semNota || temErro) &&
                            !venda.nfeDeclarada &&
                            permiteEmissao &&
                            venda.statusPagamento === "PAGO" && (
                            <Button
                              size="sm"
                              disabled={!configurado || ocupada}
                              onClick={() => {
                                setVendaEmAcao(venda.id);
                                emitirMutation.mutate({ vendaId: venda.id });
                              }}
                            >
                              {ocupada ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : temErro ? (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              ) : (
                                <Send className="h-4 w-4 mr-1" />
                              )}
                              {temErro ? "Tentar de novo" : "Emitir"}
                            </Button>
                          )}

                          {!venda.cancelada && valorDivergente && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!configurado || ocupada}
                              onClick={() => {
                                setVendaEmAcao(venda.id);
                                reemitirMutation.mutate({ vendaId: venda.id });
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reemitir
                            </Button>
                          )}

                          {temFalhaCancelamento && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!configurado || ocupada}
                              onClick={() => {
                                setVendaEmAcao(venda.id);
                                cancelarNovamenteMutation.mutate({ vendaId: venda.id });
                              }}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Cancelar de novo
                            </Button>
                          )}

                          {/* Vendas antigas, emitidas fora da integracao */}
                          {!venda.cancelada && notas.length === 0 && (
                            venda.nfeDeclarada ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => desmarcarDeclaradaMutation.mutate({ vendaId: venda.id })}
                                disabled={desmarcarDeclaradaMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Desmarcar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => marcarDeclaradaMutation.mutate({ vendaId: venda.id })}
                                disabled={marcarDeclaradaMutation.isPending}
                                title="Para notas ja emitidas fora do sistema (CSV)"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Ja declarada
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Paginacao */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Pagina {data.page} de {data.pages} ({data.total} itens)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                >
                  Proxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de visualizacao da imagem */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Visualizar imagem</DialogTitle>
          {selectedImage && (
            <div className="flex flex-col items-center">
              <img
                src={selectedImage.url}
                alt={selectedImage.sku}
                className="max-h-[80vh] w-auto object-contain rounded"
              />
              <p className="mt-2 text-sm text-muted-foreground font-mono">{selectedImage.sku}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
