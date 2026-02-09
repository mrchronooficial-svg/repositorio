"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  RotateCcw,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatusBadge } from "@/components/status-badge";
import { LogAtividade } from "@/components/log-atividade";
import { PagamentoDialog } from "@/components/dialogs/pagamento-dialog";
import { RepasseDialog } from "@/components/dialogs/repasse-dialog";
import { EditarPagamentoDialog } from "@/components/dialogs/editar-pagamento-dialog";
import { EditarRepasseDialog } from "@/components/dialogs/editar-repasse-dialog";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { FORMA_PAGAMENTO_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export default function VendaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores, podeCancelarVenda, podeRegistrarPagamento, podeRegistrarRepasse, isAdmin } = usePermissions();

  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [repasseDialogOpen, setRepasseDialogOpen] = useState(false);
  const [editarPagamento, setEditarPagamento] = useState<{ id: string; valor: number } | null>(null);
  const [editarRepasseOpen, setEditarRepasseOpen] = useState(false);

  const id = params.id as string;

  const queryOptions = trpc.venda.getById.queryOptions({ id });
  const { data: venda, isLoading } = useQuery({
    ...queryOptions,
    enabled: !!id,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
  };

  const cancelMutation = useMutation(
    trpc.venda.cancel.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Venda cancelada. Nova peca criada: ${result.novoSku}`);
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deletarPagamentoMutation = useMutation(
    trpc.venda.deletarPagamento.mutationOptions({
      onSuccess: () => {
        toast.success("Pagamento removido com sucesso!");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Venda nao encontrada</h2>
        <Button
          variant="link"
          onClick={() => router.push("/vendas")}
          className="mt-4"
        >
          Voltar para listagem
        </Button>
      </div>
    );
  }

  const handleCancel = () => {
    if (
      confirm(
        "ATENCAO: Ao cancelar esta venda, a peca retornara ao estoque com um novo SKU (devolucao). Deseja continuar?"
      )
    ) {
      cancelMutation.mutate({ vendaId: id });
    }
  };

  const handleDeletarPagamento = (pagamentoId: string, valor: number) => {
    if (
      confirm(`Tem certeza que deseja remover o pagamento de ${formatCurrency(valor)}?`)
    ) {
      deletarPagamentoMutation.mutate({ pagamentoId });
    }
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Vendas", href: "/vendas" },
          { label: `Venda #${venda.id.slice(-6)}` },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/vendas")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Venda #{venda.id.slice(-6)}
              </h1>
              {venda.cancelada && (
                <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                  Cancelada
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{formatDate(venda.dataVenda)}</p>
          </div>
        </div>

        {!venda.cancelada && (
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              onClick={() => router.push(`/vendas/${id}/editar` as Route)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
            {venda.statusPagamento !== "PAGO" && podeRegistrarPagamento && (
              <Button onClick={() => setPagamentoDialogOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Registrar Pagamento
              </Button>
            )}
            {venda.statusRepasse === "PENDENTE" ||
            venda.statusRepasse === "PARCIAL" ? (
              podeRegistrarRepasse && (
                <Button
                  variant="outline"
                  onClick={() => setRepasseDialogOpen(true)}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Registrar Repasse
                </Button>
              )
            ) : null}
            {podeCancelarVenda && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Cancelar/Devolver
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Peca */}
          <Card>
            <CardHeader>
              <CardTitle>Peca Vendida</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/estoque/${venda.peca.id}` as Route)}
              >
                {venda.peca.fotos?.[0] && (
                  <img
                    src={venda.peca.fotos[0].url}
                    alt={venda.peca.sku}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-mono font-medium text-lg">{venda.peca.sku}</p>
                  <p className="text-muted-foreground">
                    {venda.peca.marca} {venda.peca.modelo}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fornecedor: {venda.peca.fornecedor?.nome}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/clientes/${venda.cliente.id}` as Route)}
              >
                <p className="font-medium">{venda.cliente.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {venda.cliente.cidade}/{venda.cliente.estado}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Valores */}
          {podeVerValores && (
            <Card>
              <CardHeader>
                <CardTitle>Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Original</p>
                    <p className="font-medium">
                      {venda.valorOriginal
                        ? formatCurrency(Number(venda.valorOriginal))
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Desconto</p>
                    <p className="font-medium text-red-600">
                      {venda.valorDesconto
                        ? `- ${formatCurrency(Number(venda.valorDesconto))}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Final</p>
                    <p className="text-xl font-bold">
                      {venda.valorFinal
                        ? formatCurrency(Number(venda.valorFinal))
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor a Declarar</p>
                    <p className="font-medium text-orange-600">
                      {venda.valorDeclarar
                        ? formatCurrency(Number(venda.valorDeclarar))
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Forma Pagamento</p>
                    <p className="font-medium">
                      {FORMA_PAGAMENTO_LABELS[venda.formaPagamento]}
                    </p>
                  </div>
                  {venda.parcelas && (
                    <div>
                      <p className="text-sm text-muted-foreground">Parcelas</p>
                      <p className="font-medium">{venda.parcelas}x</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa MDR</p>
                    <p className="font-medium">{Number(venda.taxaMDR)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagamentos */}
          {podeVerValores && (
            <Card>
              <CardHeader>
                <CardTitle>Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {venda.pagamentos.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum pagamento registrado</p>
                ) : (
                  <div className="space-y-2">
                    {venda.pagamentos.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 rounded border group"
                      >
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(p.data)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {p.valor ? formatCurrency(Number(p.valor)) : "-"}
                          </span>
                          {!venda.cancelada && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() =>
                                  setEditarPagamento({
                                    id: p.id,
                                    valor: Number(p.valor),
                                  })
                                }
                                title="Editar pagamento"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  handleDeletarPagamento(p.id, Number(p.valor))
                                }
                                disabled={deletarPagamentoMutation.isPending}
                                title="Remover pagamento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {venda._saldoDevedor !== null && venda._saldoDevedor > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      Saldo devedor: {formatCurrency(venda._saldoDevedor)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pagamento</p>
                <StatusBadge type="pagamento" status={venda.statusPagamento} />
              </div>

              {venda.statusRepasse && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Repasse</p>
                  <StatusBadge type="repasse" status={venda.statusRepasse} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Repasse (se consignacao) */}
          {podeVerValores && venda.valorRepasseDevido && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Repasse ao Fornecedor</CardTitle>
                {!venda.cancelada && podeRegistrarRepasse && Number(venda.valorRepasseFeito || 0) > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => setEditarRepasseOpen(true)}
                    title="Editar repasse"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Devido</p>
                  <p className="font-medium">
                    {formatCurrency(Number(venda.valorRepasseDevido))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Repassado</p>
                  <p className="font-medium">
                    {formatCurrency(Number(venda.valorRepasseFeito) || 0)}
                  </p>
                </div>
                {venda.dataRepasse && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Data do Repasse
                    </p>
                    <p className="font-medium">{formatDate(venda.dataRepasse)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancelamento */}
          {venda.cancelada && venda.dataCancelamento && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Venda Cancelada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Data: {formatDate(venda.dataCancelamento)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  A peca foi devolvida ao estoque com um novo SKU.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isAdmin && <LogAtividade entidade="VENDA" entidadeId={id} />}

      {/* Dialogs */}
      {venda._saldoDevedor !== null && (
        <PagamentoDialog
          open={pagamentoDialogOpen}
          onOpenChange={setPagamentoDialogOpen}
          vendaId={id}
          saldoDevedor={venda._saldoDevedor}
          onSuccess={refetch}
        />
      )}

      {venda.valorRepasseDevido && venda.peca.fornecedor && (
        <>
          <RepasseDialog
            open={repasseDialogOpen}
            onOpenChange={setRepasseDialogOpen}
            vendaId={id}
            valorDevido={Number(venda.valorRepasseDevido)}
            valorFeito={Number(venda.valorRepasseFeito) || 0}
            fornecedorNome={venda.peca.fornecedor.nome}
            onSuccess={refetch}
          />
          <EditarRepasseDialog
            open={editarRepasseOpen}
            onOpenChange={setEditarRepasseOpen}
            vendaId={id}
            valorDevido={Number(venda.valorRepasseDevido)}
            valorFeito={Number(venda.valorRepasseFeito) || 0}
            fornecedorNome={venda.peca.fornecedor.nome}
            onSuccess={refetch}
          />
        </>
      )}

      {editarPagamento && (
        <EditarPagamentoDialog
          open={!!editarPagamento}
          onOpenChange={(open) => {
            if (!open) setEditarPagamento(null);
          }}
          pagamentoId={editarPagamento.id}
          valorAtual={editarPagamento.valor}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
