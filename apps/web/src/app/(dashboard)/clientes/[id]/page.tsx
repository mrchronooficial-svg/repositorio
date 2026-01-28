"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import {
  formatCPFCNPJ,
  formatPhone,
  formatCEP,
  formatCurrency,
  formatDate,
} from "@/lib/formatters";
import { TIPO_PESSOA_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export default function ClienteDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores, podeExcluir } = usePermissions();

  const id = params.id as string;

  const queryOptions = trpc.cliente.getById.queryOptions({ id });
  const { data: cliente, isLoading } = useQuery({
    ...queryOptions,
    enabled: !!id,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
  };

  const archiveMutation = useMutation({
    ...trpc.cliente.archive.mutationOptions(),
    onSuccess: () => {
      toast.success("Cliente arquivado com sucesso!");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const restoreMutation = useMutation({
    ...trpc.cliente.restore.mutationOptions(),
    onSuccess: () => {
      toast.success("Cliente restaurado com sucesso!");
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Cliente nao encontrado</h2>
        <Button
          variant="link"
          onClick={() => router.push("/clientes")}
          className="mt-4"
        >
          Voltar para listagem
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Clientes", href: "/clientes" },
          { label: cliente.nome },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/clientes")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{cliente.nome}</h1>
              {cliente.arquivado && (
                <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded">
                  Arquivado
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {TIPO_PESSOA_LABELS[cliente.tipo]} - {formatCPFCNPJ(cliente.cpfCnpj)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!cliente.arquivado && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/clientes/${id}/editar`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              {podeExcluir && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja arquivar este cliente?")) {
                      archiveMutation.mutate({ id });
                    }
                  }}
                  disabled={archiveMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </Button>
              )}
            </>
          )}
          {cliente.arquivado && podeExcluir && (
            <Button
              variant="outline"
              onClick={() => restoreMutation.mutate({ id })}
              disabled={restoreMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{TIPO_PESSOA_LABELS[cliente.tipo]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {cliente.tipo === "PESSOA_FISICA" ? "CPF" : "CNPJ"}
                </p>
                <p className="font-medium">{formatCPFCNPJ(cliente.cpfCnpj)}</p>
              </div>
              {cliente.dataNascimento && (
                <div>
                  <p className="text-sm text-muted-foreground">Data Nascimento</p>
                  <p className="font-medium">{formatDate(cliente.dataNascimento)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{formatPhone(cliente.telefone)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="font-medium">{cliente.email || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Endereco */}
          <Card>
            <CardHeader>
              <CardTitle>Endereco</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {cliente.rua}, {cliente.numero}
                {cliente.complemento && ` - ${cliente.complemento}`}
              </p>
              <p className="text-muted-foreground">
                {cliente.bairro} - {cliente.cidade}/{cliente.estado}
              </p>
              <p className="text-muted-foreground">
                CEP: {formatCEP(cliente.cep)}
              </p>
            </CardContent>
          </Card>

          {/* Historico de compras */}
          <Card>
            <CardHeader>
              <CardTitle>Historico de Compras ({cliente.vendas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {cliente.vendas.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma compra registrada</p>
              ) : (
                <div className="space-y-2">
                  {cliente.vendas.map((venda) => (
                    <div
                      key={venda.id}
                      className="flex items-center justify-between p-3 rounded border hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/vendas/${venda.id}`)}
                    >
                      <div>
                        <p className="font-mono text-sm">{venda.peca.sku}</p>
                        <p className="text-sm text-muted-foreground">
                          {venda.peca.marca} {venda.peca.modelo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(venda.dataVenda)}
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
        </div>

        {/* Coluna lateral - Metricas */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metricas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total de Compras</p>
                <p className="text-2xl font-bold">
                  {cliente._metricas.totalCompras}
                </p>
              </div>

              {podeVerValores && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-2xl font-bold">
                      {cliente._metricas.faturamento !== null
                        ? formatCurrency(cliente._metricas.faturamento)
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      LTV (Lucro Total)
                    </p>
                    <p className="text-2xl font-bold">
                      {cliente._metricas.ltv !== null
                        ? formatCurrency(cliente._metricas.ltv)
                        : "-"}
                    </p>
                  </div>
                </>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Tempo como Cliente</p>
                <p className="text-2xl font-bold">
                  {cliente._metricas.tempoComoCliente} dias
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Recorrencia (compras/mes)
                </p>
                <p className="text-2xl font-bold">
                  {cliente._metricas.recorrencia}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
