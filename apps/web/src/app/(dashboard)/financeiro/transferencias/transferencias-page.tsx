"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function TransferenciasPage() {
  const queryClient = useQueryClient();
  const [contaOrigemId, setContaOrigemId] = useState("");
  const [contaDestinoId, setContaDestinoId] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [descricao, setDescricao] = useState("");

  const { data: contasBancarias, isLoading: isLoadingContas } = useQuery(
    trpc.financeiro.listContasBancarias.queryOptions()
  );

  const { data: transferencias, isLoading: isLoadingTransf } = useQuery(
    trpc.financeiro.listTransferencias.queryOptions({ page: 1, limit: 50 })
  );

  const createMutation = useMutation(
    trpc.financeiro.createTransferencia.mutationOptions({
      onSuccess: () => {
        toast.success("Transferencia registrada com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro"]] });
        setContaOrigemId("");
        setContaDestinoId("");
        setValor("");
        setDescricao("");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      contaOrigemId,
      contaDestinoId,
      valor: parseFloat(valor),
      data: new Date(data + "T12:00:00"),
      descricao: descricao || undefined,
    });
  };

  if (isLoadingContas) {
    return <Skeleton className="h-96 w-full" />;
  }

  const contas = contasBancarias ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transferencias Bancarias</h1>
        <p className="text-muted-foreground">
          Movimentacoes entre contas bancarias (sem impacto na DRE)
        </p>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova Transferencia</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Conta Origem</Label>
                <Select value={contaOrigemId} onValueChange={setContaOrigemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({c.banco})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-center">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <Label>Conta Destino</Label>
                <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({c.banco})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descricao (opcional)</Label>
                <Input
                  placeholder="Ex: Consolidacao de saldo"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !contaOrigemId ||
                  !contaDestinoId ||
                  !valor
                }
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Registrar Transferencia
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historico de Transferencias</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Descricao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferencias?.transferencias && transferencias.transferencias.length > 0 ? (
                transferencias.transferencias.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{formatDate(t.data)}</TableCell>
                    <TableCell className="text-sm">{t.contaOrigem.nome}</TableCell>
                    <TableCell className="text-sm">{t.contaDestino.nome}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(t.valor)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.descricao || "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma transferencia registrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
