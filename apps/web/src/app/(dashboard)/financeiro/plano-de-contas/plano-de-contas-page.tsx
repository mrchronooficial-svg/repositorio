"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { ContaTree } from "@/components/financeiro/conta-tree";
import { ContaFormDialog } from "@/components/financeiro/conta-form-dialog";
import { ContaBancariaSection } from "@/components/financeiro/conta-bancaria-section";

type ContaFormData = {
  codigo: string;
  nome: string;
  tipo: "GRUPO" | "SUBGRUPO" | "ANALITICA";
  natureza: "DEVEDORA" | "CREDORA";
  contaPaiId: string | null;
  ordem?: number;
};

export function PlanoDeContasPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<{
    id: string;
    codigo: string;
    nome: string;
    tipo: "GRUPO" | "SUBGRUPO" | "ANALITICA";
    natureza: "DEVEDORA" | "CREDORA";
    contaPaiId: string | null;
    ordem: number;
  } | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);

  const { data: contas, isLoading } = useQuery(
    trpc.financeiro.listContas.queryOptions()
  );

  const { data: contasBancarias, isLoading: isLoadingBancos } = useQuery(
    trpc.financeiro.listContasBancarias.queryOptions()
  );

  const createMutation = useMutation(
    trpc.financeiro.createConta.mutationOptions({
      onSuccess: () => {
        toast.success("Conta criada com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listContas"]] });
        setDialogOpen(false);
        setParentForNew(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.financeiro.updateConta.mutationOptions({
      onSuccess: () => {
        toast.success("Conta atualizada com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listContas"]] });
        setDialogOpen(false);
        setEditingConta(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.financeiro.deleteConta.mutationOptions({
      onSuccess: () => {
        toast.success("Conta excluida com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listContas"]] });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleCreate = (data: ContaFormData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: ContaFormData & { id: string }) => {
    updateMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleEdit = (conta: {
    id: string;
    codigo: string;
    nome: string;
    tipo: "GRUPO" | "SUBGRUPO" | "ANALITICA";
    natureza: "DEVEDORA" | "CREDORA";
    contaPaiId: string | null;
    ordem: number;
  }) => {
    setEditingConta(conta);
    setParentForNew(null);
    setDialogOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingConta(null);
    setParentForNew(parentId);
    setDialogOpen(true);
  };

  const handleNewRoot = () => {
    setEditingConta(null);
    setParentForNew(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plano de Contas</h1>
          <p className="text-muted-foreground">
            Estrutura hierarquica de contas contabeis (padrao CPC/CFC)
          </p>
        </div>
        <Button onClick={handleNewRoot}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Arvore do plano de contas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contas Contabeis</CardTitle>
        </CardHeader>
        <CardContent>
          {contas && contas.length > 0 ? (
            <ContaTree
              contas={contas}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma conta cadastrada.</p>
              <p className="text-sm mt-1">
                Execute o seed para popular o plano de contas padrao.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contas Bancarias */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Landmark className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Contas Bancarias</CardTitle>
        </CardHeader>
        <CardContent>
          <ContaBancariaSection
            contasBancarias={contasBancarias ?? []}
            isLoading={isLoadingBancos}
            contasContabeis={contas ?? []}
          />
        </CardContent>
      </Card>

      {/* Dialog de criacao/edicao */}
      <ContaFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingConta(null);
            setParentForNew(null);
          }
        }}
        editingConta={editingConta}
        parentForNew={parentForNew}
        contas={contas ?? []}
        onSubmit={(data) => {
          if (editingConta) {
            handleUpdate({ ...data, id: editingConta.id });
          } else {
            handleCreate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
