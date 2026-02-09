"use client";

import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Archive, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatusBadge } from "@/components/status-badge";
import { LogAtividade } from "@/components/log-atividade";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCPFCNPJ, formatPhone, formatCEP, formatCurrency } from "@/lib/formatters";
import { TIPO_PESSOA_LABELS } from "@/lib/constants";
import { toast } from "sonner";

export default function FornecedorDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores, podeExcluir, isAdmin } = usePermissions();

  const id = params.id as string;

  const queryOptions = trpc.fornecedor.getById.queryOptions({ id });
  const { data: fornecedor, isLoading } = useQuery({
    ...queryOptions,
    enabled: !!id,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
  };

  const archiveMutation = useMutation(
    trpc.fornecedor.archive.mutationOptions({
      onSuccess: () => {
        toast.success("Fornecedor arquivado com sucesso!");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const restoreMutation = useMutation(
    trpc.fornecedor.restore.mutationOptions({
      onSuccess: () => {
        toast.success("Fornecedor restaurado com sucesso!");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.fornecedor.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Fornecedor excluido permanentemente!");
        router.push("/fornecedores");
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!fornecedor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Fornecedor nao encontrado</h2>
        <Button
          variant="link"
          onClick={() => router.push("/fornecedores")}
          className="mt-4"
        >
          Voltar para listagem
        </Button>
      </div>
    );
  }

  const handleArchive = () => {
    if (confirm("Tem certeza que deseja arquivar este fornecedor?")) {
      archiveMutation.mutate({ id });
    }
  };

  const handleRestore = () => {
    restoreMutation.mutate({ id });
  };

  const handleDelete = () => {
    if (confirm("ATENCAO: Esta acao e irreversivel. Tem certeza que deseja excluir permanentemente este fornecedor?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Fornecedores", href: "/fornecedores" },
          { label: fornecedor.nome },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/fornecedores")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{fornecedor.nome}</h1>
              {fornecedor.arquivado && (
                <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded">
                  Arquivado
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {TIPO_PESSOA_LABELS[fornecedor.tipo]} - {formatCPFCNPJ(fornecedor.cpfCnpj)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!fornecedor.arquivado && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/fornecedores/${id}/editar` as Route)}
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
          {fornecedor.arquivado && podeExcluir && (
            <>
              <Button
                variant="outline"
                onClick={handleRestore}
                disabled={restoreMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informacoes */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{TIPO_PESSOA_LABELS[fornecedor.tipo]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {fornecedor.tipo === "PESSOA_FISICA" ? "CPF" : "CNPJ"}
                </p>
                <p className="font-medium">{formatCPFCNPJ(fornecedor.cpfCnpj)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{formatPhone(fornecedor.telefone)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="font-medium">{fornecedor.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score</p>
                {fornecedor.score ? (
                  <StatusBadge type="score" status={fornecedor.score} />
                ) : (
                  <p className="font-medium">-</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereco</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {fornecedor.rua}, {fornecedor.numero}
                {fornecedor.complemento && ` - ${fornecedor.complemento}`}
              </p>
              <p className="text-muted-foreground">
                {fornecedor.bairro} - {fornecedor.cidade}/{fornecedor.estado}
              </p>
              <p className="text-muted-foreground">
                CEP: {formatCEP(fornecedor.cep)}
              </p>
            </CardContent>
          </Card>

          {/* Pecas do fornecedor */}
          <Card>
            <CardHeader>
              <CardTitle>Pecas ({fornecedor.pecas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {fornecedor.pecas.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma peca cadastrada</p>
              ) : (
                <div className="space-y-2">
                  {fornecedor.pecas.map((peca) => (
                    <div
                      key={peca.id}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/estoque/${peca.id}` as Route)}
                    >
                      <div>
                        <p className="font-medium">{peca.sku}</p>
                        <p className="text-sm text-muted-foreground">
                          {peca.marca} {peca.modelo}
                        </p>
                      </div>
                      <StatusBadge type="peca" status={peca.status} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metricas */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metricas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total de Pecas</p>
                <p className="text-2xl font-bold">{fornecedor._metricas.totalPecas}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Estoque</p>
                <p className="text-2xl font-bold">{fornecedor._metricas.pecasEmEstoque}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendidas</p>
                <p className="text-2xl font-bold">{fornecedor._metricas.pecasVendidas}</p>
              </div>
              {podeVerValores && fornecedor._metricas.volumeTransacionado !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Volume Transacionado</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(fornecedor._metricas.volumeTransacionado)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isAdmin && <LogAtividade entidade="FORNECEDOR" entidadeId={id} />}
    </div>
  );
}
