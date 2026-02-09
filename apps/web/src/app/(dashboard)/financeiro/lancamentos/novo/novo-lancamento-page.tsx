"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/utils/trpc";
import { formatCurrency } from "@/lib/formatters";

interface LinhaForm {
  contaDebitoId: string;
  contaCreditoId: string;
  valor: string;
  historico: string;
}

const emptyLinha: LinhaForm = {
  contaDebitoId: "",
  contaCreditoId: "",
  valor: "",
  historico: "",
};

export function NovoLancamentoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [descricao, setDescricao] = useState("");
  const [recorrente, setRecorrente] = useState(true);
  const [linhas, setLinhas] = useState<LinhaForm[]>([{ ...emptyLinha }]);

  const { data: contasAnaliticas } = useQuery(
    trpc.financeiro.listContasAnaliticas.queryOptions()
  );

  const createMutation = useMutation(
    trpc.financeiro.createLancamento.mutationOptions({
      onSuccess: () => {
        toast.success("Lancamento criado com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listLancamentos"]] });
        router.push("/financeiro/lancamentos" as Route);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const addLinha = () => {
    setLinhas([...linhas, { ...emptyLinha }]);
  };

  const removeLinha = (index: number) => {
    if (linhas.length > 1) {
      setLinhas(linhas.filter((_, i) => i !== index));
    }
  };

  const updateLinha = (index: number, field: keyof LinhaForm, value: string) => {
    const updated = [...linhas];
    updated[index] = { ...updated[index], [field]: value };
    setLinhas(updated);
  };

  const totalDebito = linhas.reduce((acc, l) => acc + (parseFloat(l.valor) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const linhasValidas = linhas.filter(
      (l) => l.contaDebitoId && l.contaCreditoId && parseFloat(l.valor) > 0
    );

    if (linhasValidas.length === 0) {
      toast.error("Adicione pelo menos uma linha valida");
      return;
    }

    createMutation.mutate({
      data: new Date(data + "T12:00:00"),
      descricao,
      recorrente,
      linhas: linhasValidas.map((l) => ({
        contaDebitoId: l.contaDebitoId,
        contaCreditoId: l.contaCreditoId,
        valor: parseFloat(l.valor),
        historico: l.historico || undefined,
      })),
    });
  };

  const contas = contasAnaliticas ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Lancamento Manual</h1>
          <p className="text-muted-foreground">
            Registre um lancamento com partidas dobradas (debito/credito)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Cabeçalho */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados do Lancamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descricao</Label>
                <Input
                  id="descricao"
                  placeholder="Ex: Pagamento Ads Instagram — Janeiro"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="recorrente"
                checked={recorrente}
                onCheckedChange={(checked) => setRecorrente(checked === true)}
              />
              <Label htmlFor="recorrente" className="text-sm font-normal">
                Despesa recorrente (desmarque para one-off / nao recorrente)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Linhas */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Linhas do Lancamento</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLinha}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Linha
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {linhas.map((linha, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_1fr_40px] gap-3 items-end p-4 rounded-lg border bg-muted/30"
              >
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Debito (D)</Label>
                  <Select
                    value={linha.contaDebitoId}
                    onValueChange={(v) => updateLinha(index, "contaDebitoId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Conta debito" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.codigo} — {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Credito (C)</Label>
                  <Select
                    value={linha.contaCreditoId}
                    onValueChange={(v) => updateLinha(index, "contaCreditoId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Conta credito" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.codigo} — {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={linha.valor}
                    onChange={(e) => updateLinha(index, "valor", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Historico (opcional)</Label>
                  <Input
                    placeholder="Descricao da linha"
                    value={linha.historico}
                    onChange={(e) => updateLinha(index, "historico", e.target.value)}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-destructive"
                  onClick={() => removeLinha(index)}
                  disabled={linhas.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-end pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total do lancamento</p>
                <p className="text-xl font-bold">{formatCurrency(totalDebito)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Criar Lancamento
          </Button>
        </div>
      </form>
    </div>
  );
}
