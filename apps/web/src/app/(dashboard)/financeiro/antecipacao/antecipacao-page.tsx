"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PiggyBank, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

export function AntecipacaoPage() {
  const queryClient = useQueryClient();
  const [selectedVendas, setSelectedVendas] = useState<string[]>([]);
  const [taxa, setTaxa] = useState("3.5");
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);

  const { data: recebiveis, isLoading: isLoadingRecebiveis } = useQuery(
    trpc.financeiro.listRecebiveisParaAntecipar.queryOptions()
  );

  const { data: contasBancarias } = useQuery(
    trpc.financeiro.listContasBancarias.queryOptions()
  );

  const { data: antecipacoes, isLoading: isLoadingAntecipacoes } = useQuery(
    trpc.financeiro.listAntecipacoes.queryOptions({ page: 1, limit: 20 })
  );

  const createMutation = useMutation(
    trpc.financeiro.createAntecipacao.mutationOptions({
      onSuccess: () => {
        toast.success("Antecipação registrada com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro"]] });
        setSelectedVendas([]);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const toggleVenda = (vendaId: string) => {
    setSelectedVendas((prev) =>
      prev.includes(vendaId)
        ? prev.filter((id) => id !== vendaId)
        : [...prev, vendaId]
    );
  };

  const selectAll = () => {
    if (!recebiveis) return;
    if (selectedVendas.length === recebiveis.length) {
      setSelectedVendas([]);
    } else {
      setSelectedVendas(recebiveis.map((r) => r.vendaId));
    }
  };

  // Calcular preview
  const valorBruto = (recebiveis ?? [])
    .filter((r) => selectedVendas.includes(r.vendaId))
    .reduce((acc, r) => acc + r.saldoPendente, 0);
  const taxaNum = parseFloat(taxa) || 0;
  const valorTaxa = Math.round(valorBruto * (taxaNum / 100) * 100) / 100;
  const valorLiquido = Math.round((valorBruto - valorTaxa) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      vendaIds: selectedVendas,
      taxaAntecipacao: taxaNum,
      contaBancariaId,
      data: new Date(data + "T12:00:00"),
    });
  };

  const contas = (contasBancarias ?? []) as Array<{ id: string; nome: string }>;

  if (isLoadingRecebiveis) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Antecipação de Recebíveis</h1>
        <p className="text-muted-foreground">
          Selecione recebíveis em cartão para antecipar, informe a taxa da operadora
        </p>
      </div>

      {/* Seleção de recebíveis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recebíveis Disponíveis</CardTitle>
            {recebiveis && recebiveis.length > 0 && (
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedVendas.length === recebiveis.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Peça</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Saldo Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recebiveis && recebiveis.length > 0 ? (
                recebiveis.map((r) => (
                  <TableRow
                    key={r.vendaId}
                    className="cursor-pointer"
                    onClick={() => toggleVenda(r.vendaId)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedVendas.includes(r.vendaId)}
                        onCheckedChange={() => toggleVenda(r.vendaId)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.sku} — {r.marca} {r.modelo}
                    </TableCell>
                    <TableCell className="text-sm">{r.cliente}</TableCell>
                    <TableCell className="text-sm">{formatDate(r.dataVenda)}</TableCell>
                    <TableCell className="text-sm">
                      {r.formaPagamento === "CREDITO_PARCELADO"
                        ? `Cartão ${r.parcelas}x`
                        : "Cartão à vista"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(r.saldoPendente)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum recebível disponível para antecipação
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Formulário de antecipação */}
      {selectedVendas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registrar Antecipação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Preview */}
              <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Recebíveis selecionados</p>
                  <p className="text-lg font-bold">{selectedVendas.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Bruto</p>
                  <p className="text-lg font-bold">{formatCurrency(valorBruto)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taxa ({taxa}%)</p>
                  <p className="text-lg font-bold text-red-600">−{formatCurrency(valorTaxa)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Líquido</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(valorLiquido)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Taxa de Antecipação (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    value={taxa}
                    onChange={(e) => setTaxa(e.target.value)}
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
                  <Label>Conta de Entrada</Label>
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

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !contaBancariaId || selectedVendas.length === 0}
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Check className="h-4 w-4 mr-2" />
                  Registrar Antecipação
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Antecipações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Data</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Valor Líquido</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {antecipacoes?.antecipacoes && antecipacoes.antecipacoes.length > 0 ? (
                (antecipacoes.antecipacoes as Array<{ id: string; data: string; valorBruto: string; valorTaxa: string; taxaAntecipacao: string; valorLiquido: string; contaBancaria: { nome: string }; vendas: unknown[] }>).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{formatDate(a.data)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(a.valorBruto)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">
                      −{formatCurrency(a.valorTaxa)} ({Number(a.taxaAntecipacao)}%)
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {formatCurrency(a.valorLiquido)}
                    </TableCell>
                    <TableCell className="text-sm">{a.contaBancaria.nome}</TableCell>
                    <TableCell className="text-center text-sm">{a.vendas.length}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma antecipação registrada
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
