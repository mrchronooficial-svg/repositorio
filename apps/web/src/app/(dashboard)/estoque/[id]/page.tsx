"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit,
  Archive,
  Trash2,
  RotateCcw,
  RefreshCw,
  DollarSign,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatusBadge } from "@/components/status-badge";
import { LogAtividade } from "@/components/log-atividade";
import { HistoricoStatus } from "@/components/historico-status";
import { StatusDialog } from "@/components/dialogs/status-dialog";
import { PagamentoFornecedorDialog } from "@/components/dialogs/pagamento-fornecedor-dialog";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ORIGEM_TIPO_LABELS, ORIGEM_CANAL_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export default function PecaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores, podeExcluir, isAdmin } = usePermissions();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);

  const id = params.id as string;

  const queryOptions = trpc.peca.getById.queryOptions({ id });
  const { data: peca, isLoading } = useQuery({
    ...queryOptions,
    enabled: !!id,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
  };

  const archiveMutation = useMutation({
    ...trpc.peca.archive.mutationOptions(),
    onSuccess: () => {
      toast.success("Peca arquivada com sucesso!");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const restoreMutation = useMutation({
    ...trpc.peca.restore.mutationOptions(),
    onSuccess: () => {
      toast.success("Peca restaurada com sucesso!");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    ...trpc.peca.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Peca excluida permanentemente!");
      router.push("/estoque");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!peca) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Peca nao encontrada</h2>
        <Button
          variant="link"
          onClick={() => router.push("/estoque")}
          className="mt-4"
        >
          Voltar para estoque
        </Button>
      </div>
    );
  }

  const handleArchive = () => {
    if (confirm("Tem certeza que deseja arquivar esta peca?")) {
      archiveMutation.mutate({ id });
    }
  };

  const handleRestore = () => {
    restoreMutation.mutate({ id });
  };

  const handleDelete = () => {
    if (
      confirm(
        "ATENCAO: Esta acao e irreversivel. Tem certeza que deseja excluir permanentemente esta peca?"
      )
    ) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Estoque", href: "/estoque" },
          { label: peca.sku },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/estoque")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono">{peca.sku}</h1>
              {peca.arquivado && (
                <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded">
                  Arquivada
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {peca.marca} {peca.modelo}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!peca.arquivado && (
            <>
              <Button
                variant="outline"
                onClick={() => setStatusDialogOpen(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Alterar Status
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/estoque/${id}/editar`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              {podeExcluir && (
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  disabled={archiveMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </Button>
              )}
            </>
          )}
          {peca.arquivado && podeExcluir && (
            <>
              <Button
                variant="outline"
                onClick={handleRestore}
                disabled={restoreMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
              </Button>
              {isAdmin && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galeria de fotos */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              {peca.fotos.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma foto cadastrada</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {peca.fotos.map((foto, index) => (
                    <img
                      key={foto.id}
                      src={foto.url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados do relogio */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Relogio</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Marca</p>
                <p className="font-medium">{peca.marca}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-medium">{peca.modelo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ano</p>
                <p className="font-medium">{peca.ano || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tamanho Caixa</p>
                <p className="font-medium">{peca.tamanhoCaixa}mm</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Material Caixa</p>
                <p className="font-medium">{peca.materialCaixa || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Material Pulseira</p>
                <p className="font-medium">{peca.materialPulseira || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Valores e Origem */}
          <Card>
            <CardHeader>
              <CardTitle>Valores e Origem</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {podeVerValores ? (
                <>
                  {/* Valor de compra so aparece para COMPRA */}
                  {peca.origemTipo === "COMPRA" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Compra</p>
                      <p className="font-medium">
                        {formatCurrency(Number(peca.valorCompra))}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Estimado Venda</p>
                    <p className="font-medium">
                      {formatCurrency(Number(peca.valorEstimadoVenda))}
                    </p>
                  </div>
                  {/* Valor de repasse so aparece para CONSIGNACAO */}
                  {peca.origemTipo === "CONSIGNACAO" && peca.valorRepasse && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Valor Repasse (ao fornecedor)
                      </p>
                      <p className="font-medium">
                        {formatCurrency(Number(peca.valorRepasse))}
                      </p>
                    </div>
                  )}
                  {peca.origemTipo === "CONSIGNACAO" && peca.percentualRepasse && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Repasse (ao fornecedor)
                      </p>
                      <p className="font-medium">
                        {peca.percentualRepasse}% do valor final da venda
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-3">
                  <p className="text-sm text-muted-foreground">
                    Valores ocultos para seu nivel de acesso
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Tipo Origem</p>
                <p className="font-medium">
                  {ORIGEM_TIPO_LABELS[peca.origemTipo]}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canal</p>
                <p className="font-medium">
                  {peca.origemCanal
                    ? ORIGEM_CANAL_LABELS[peca.origemCanal]
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Cadastro</p>
                <p className="font-medium">{formatDate(peca.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Fornecedor */}
          <Card>
            <CardHeader>
              <CardTitle>Fornecedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/fornecedores/${peca.fornecedor.id}`)}
              >
                <p className="font-medium">{peca.fornecedor.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {peca.fornecedor.cidade}/{peca.fornecedor.estado}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Status atual */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge type="peca" status={peca.status} />
                {!peca.arquivado && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatusDialogOpen(true)}
                  >
                    Alterar
                  </Button>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Localizacao</p>
                <p className="font-medium">{peca.localizacao}</p>
              </div>
            </CardContent>
          </Card>

          {/* Pagamento ao Fornecedor (COMPRA) ou Repasse ao Fornecedor (CONSIGNACAO) */}
          {podeVerValores && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">
                  {peca.origemTipo === "CONSIGNACAO" ? "Repasse ao Fornecedor" : "Pagamento ao Fornecedor"}
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                {peca.origemTipo === "CONSIGNACAO" ? (
                  // CONSIGNACAO - Mostra info de repasse
                  <>
                    {peca.status !== "VENDIDA" ? (
                      // Ainda nao vendida
                      <div className="text-center py-2">
                        <p className="text-sm text-muted-foreground">
                          Nenhum repasse devido
                        </p>
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                          O repasse ao fornecedor so e devido apos a venda da peca
                        </p>
                      </div>
                    ) : (
                      // Vendida - mostra status do repasse
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <StatusBadge
                            type="repasse"
                            status={peca.venda?.statusRepasse || "PENDENTE"}
                            size="sm"
                          />
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Valor do Repasse:</span>
                            <span className="font-medium">
                              {formatCurrency(Number(peca.venda?.valorRepasseDevido || peca.valorRepasse || 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Repassado:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(Number(peca.venda?.valorRepasseFeito || 0))}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span className="text-muted-foreground">Pendente:</span>
                            <span className={`font-medium ${(Number(peca.venda?.valorRepasseDevido || 0) - Number(peca.venda?.valorRepasseFeito || 0)) > 0 ? "text-orange-600" : "text-green-600"}`}>
                              {formatCurrency(Number(peca.venda?.valorRepasseDevido || 0) - Number(peca.venda?.valorRepasseFeito || 0))}
                            </span>
                          </div>
                        </div>

                        {peca.venda?.statusRepasse === "FEITO" && (
                          <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
                            Repasse concluido em {peca.venda.dataRepasse ? formatDate(peca.venda.dataRepasse) : "-"}
                          </p>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  // COMPRA - Mostra info de pagamento ao fornecedor
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <StatusBadge type="pagamento" status={peca.statusPagamentoFornecedor} size="sm" />
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor da Compra:</span>
                        <span className="font-medium">
                          {formatCurrency(Number(peca.valorCompra))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pago:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(Number(peca.valorPagoFornecedor))}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-muted-foreground">Restante:</span>
                        <span className={`font-medium ${Number(peca.valorCompra) - Number(peca.valorPagoFornecedor) > 0 ? "text-orange-600" : "text-green-600"}`}>
                          {formatCurrency(Number(peca.valorCompra) - Number(peca.valorPagoFornecedor))}
                        </span>
                      </div>
                    </div>

                    {/* Historico de pagamentos */}
                    {peca.pagamentosFornecedor && peca.pagamentosFornecedor.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground">Historico:</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {peca.pagamentosFornecedor.map((pag) => (
                            <div key={pag.id} className="flex justify-between text-xs bg-muted/50 p-2 rounded">
                              <span>{formatDate(pag.data)}</span>
                              <span className="font-medium">{formatCurrency(Number(pag.valor))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botao registrar pagamento - so para COMPRA */}
                    {!peca.arquivado && Number(peca.valorCompra) - Number(peca.valorPagoFornecedor) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setPagamentoDialogOpen(true)}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Registrar Pagamento
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Venda (se vendida) */}
          {peca.venda && (
            <Card>
              <CardHeader>
                <CardTitle>Venda</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/vendas/${peca.venda!.id}`)}
                >
                  <p className="font-medium">
                    {peca.venda.cliente?.nome || "Cliente"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(peca.venda.dataVenda)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historico */}
          <Card>
            <CardHeader>
              <CardTitle>Historico</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoricoStatus historico={peca.historicoStatus} />
            </CardContent>
          </Card>
        </div>
      </div>

      {isAdmin && <LogAtividade entidade="PECA" entidadeId={id} />}

      {/* Dialog de status */}
      <StatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        pecaId={id}
        currentStatus={peca.status}
        currentLocalizacao={peca.localizacao}
        onSuccess={refetch}
      />

      {/* Dialog de pagamento ao fornecedor - apenas para COMPRA */}
      {podeVerValores && peca.origemTipo === "COMPRA" && (
        <PagamentoFornecedorDialog
          open={pagamentoDialogOpen}
          onOpenChange={setPagamentoDialogOpen}
          pecaId={id}
          sku={peca.sku}
          valorCompra={Number(peca.valorCompra) || 0}
          valorPago={Number(peca.valorPagoFornecedor) || 0}
          origemTipo={peca.origemTipo}
          statusPeca={peca.status}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
