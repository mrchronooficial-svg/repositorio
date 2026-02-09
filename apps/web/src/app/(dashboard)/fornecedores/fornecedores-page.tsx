"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FornecedoresTable } from "@/components/tables/fornecedores-table";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";

export function FornecedoresPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { podeVerValores, isAdmin } = usePermissions();

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<string | undefined>();
  const [score, setScore] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(
    trpc.fornecedor.list.queryOptions({
      page,
      limit: 20,
      search: search || undefined,
      tipo: tipo as "PESSOA_FISICA" | "PESSOA_JURIDICA" | undefined,
      score: score as "EXCELENTE" | "BOM" | "REGULAR" | "RUIM" | undefined,
    })
  );

  const limparFiltros = () => {
    setSearch("");
    setTipo(undefined);
    setScore(undefined);
    setPage(1);
  };

  const temFiltros = search || tipo || score;

  const deleteMutation = useMutation(trpc.fornecedor.delete.mutationOptions());

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Fornecedor excluido com sucesso");
      queryClient.invalidateQueries({ queryKey: ["fornecedor", "list"] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir fornecedor";
      toast.error(message);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} fornecedor(es) cadastrado(s)
          </p>
        </div>
        <Button onClick={() => router.push("/fornecedores/novo")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF/CNPJ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={tipo || "all"}
          onValueChange={(value) => {
            setTipo(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="PESSOA_FISICA">Pessoa Fisica</SelectItem>
            <SelectItem value="PESSOA_JURIDICA">Pessoa Juridica</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={score || "all"}
          onValueChange={(value) => {
            setScore(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os scores</SelectItem>
            <SelectItem value="EXCELENTE">Excelente</SelectItem>
            <SelectItem value="BOM">Bom</SelectItem>
            <SelectItem value="REGULAR">Regular</SelectItem>
            <SelectItem value="RUIM">Ruim</SelectItem>
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
      <FornecedoresTable
        fornecedores={data?.fornecedores ?? []}
        isLoading={isLoading}
        podeVerValores={podeVerValores}
        podeExcluir={isAdmin}
        onView={(id) => router.push(`/fornecedores/${id}` as Route)}
        onDelete={handleDelete}
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
