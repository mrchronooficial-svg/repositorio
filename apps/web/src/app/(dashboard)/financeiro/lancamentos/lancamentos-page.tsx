"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Plus, RotateCcw, Filter } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { trpc } from "@/utils/trpc";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { TIPO_LANCAMENTO_LABELS } from "@/lib/constants";

export function LancamentosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");

  const { data, isLoading } = useQuery(
    trpc.financeiro.listLancamentos.queryOptions({
      page,
      limit: 20,
      search: search || undefined,
      tipo: tipoFilter !== "all" ? tipoFilter as "MANUAL" : undefined,
    })
  );

  const estornarMutation = useMutation(
    trpc.financeiro.estornarLancamento.mutationOptions({
      onSuccess: () => {
        toast.success("Lancamento estornado com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listLancamentos"]] });
      },
      onError: (error) => toast.error(error.message),
    })
  );

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
          <h1 className="text-2xl font-bold">Lancamentos Contabeis</h1>
          <p className="text-muted-foreground">
            Historico de todos os lancamentos (manuais e automaticos)
          </p>
        </div>
        <Button onClick={() => router.push("/financeiro/lancamentos/novo" as Route)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lancamento
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por descricao..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={tipoFilter}
              onValueChange={(v) => {
                setTipoFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-64">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="AUTOMATICO_VENDA">Automatico (Venda)</SelectItem>
                <SelectItem value="AUTOMATICO_DESPESA_RECORRENTE">Despesa Recorrente</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="DISTRIBUICAO_LUCROS">Distribuicao</SelectItem>
                <SelectItem value="ANTECIPACAO">Antecipacao</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead className="w-40">Tipo</TableHead>
                <TableHead className="text-right w-32">Valor</TableHead>
                <TableHead className="w-20">Linhas</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.lancamentos && data.lancamentos.length > 0 ? (
                data.lancamentos.map((l) => {
                  const totalValor = l.linhas.reduce(
                    (acc, line) => acc + Number(line.valor),
                    0
                  );
                  return (
                    <TableRow key={l.id} className={l.estornado ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {l.numero}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(l.data)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.descricao}
                        {l.estornado && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Estornado
                          </Badge>
                        )}
                        {!l.recorrente && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            One-off
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {TIPO_LANCAMENTO_LABELS[l.tipo] || l.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(totalValor)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {l.linhas.length}
                      </TableCell>
                      <TableCell>
                        {!l.estornado && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            onClick={() => {
                              if (confirm("Deseja estornar este lancamento?")) {
                                estornarMutation.mutate({ id: l.id });
                              }
                            }}
                            title="Estornar"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum lancamento encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
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
