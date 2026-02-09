"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
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
import { SOCIOS } from "@/lib/constants";

export function DistribuicaoLucrosPage() {
  const queryClient = useQueryClient();
  const [socio, setSocio] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data: contasBancarias } = useQuery(
    trpc.financeiro.listContasBancarias.queryOptions()
  );

  const { data: distribuicoes, isLoading } = useQuery(
    trpc.financeiro.listDistribuicoes.queryOptions({ page: 1, limit: 50 })
  );

  const createMutation = useMutation(
    trpc.financeiro.createDistribuicao.mutationOptions({
      onSuccess: () => {
        toast.success("Distribuicao de lucros registrada");
        queryClient.invalidateQueries({ queryKey: [["financeiro"]] });
        setSocio("");
        setValor("");
        setDescricao("");
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      socio,
      valor: parseFloat(valor),
      data: new Date(data + "T12:00:00"),
      contaBancariaId,
      descricao: descricao || undefined,
    });
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const contas = contasBancarias ?? [];
  const totais = distribuicoes?.totaisPorSocio ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Distribuicao de Lucros</h1>
        <p className="text-muted-foreground">
          Registre retiradas dos socios (reduz Patrimonio Liquido)
        </p>
      </div>

      {/* Cards de totais por sócio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOCIOS.map((s) => {
          const total = totais.find((t) => t.socio === s)?.total ?? 0;
          return (
            <Card key={s}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{s}</p>
                    <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                    <p className="text-xs text-muted-foreground">total distribuido</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova Distribuicao</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Socio</Label>
                <Select value={socio} onValueChange={setSocio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIOS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label>Conta de Saida</Label>
                <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descricao (opcional)</Label>
              <Input
                placeholder="Ex: Retirada mensal"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createMutation.isPending || !socio || !valor || !contaBancariaId}
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Registrar Distribuicao
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historico de Distribuicoes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Socio</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Descricao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribuicoes?.distribuicoes && distribuicoes.distribuicoes.length > 0 ? (
                distribuicoes.distribuicoes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">{formatDate(d.data)}</TableCell>
                    <TableCell className="font-medium">{d.socio}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(d.valor)}
                    </TableCell>
                    <TableCell className="text-sm">{d.contaBancaria.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.descricao || "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma distribuicao registrada
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
