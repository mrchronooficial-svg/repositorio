"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Play, Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { formatCurrency } from "@/lib/formatters";

export function DespesasRecorrentesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [contaContabilId, setContaContabilId] = useState("");
  const [executeMes, setExecuteMes] = useState(new Date().getMonth() + 1);
  const [executeAno, setExecuteAno] = useState(new Date().getFullYear());

  // Taxas state
  const [taxaMDR, setTaxaMDR] = useState("");
  const [aliquotaSimples, setAliquotaSimples] = useState("");
  const [simplesAutomatico, setSimplesAutomatico] = useState(true);

  const { data: configuracoes } = useQuery(
    trpc.configuracao.getAll.queryOptions()
  );

  // Sync config values when loaded
  useEffect(() => {
    if (configuracoes) {
      setTaxaMDR(configuracoes.TAXA_MDR || "4");
      const aliq = configuracoes.ALIQUOTA_SIMPLES || "auto";
      if (aliq === "auto") {
        setSimplesAutomatico(true);
        setAliquotaSimples("");
      } else {
        setSimplesAutomatico(false);
        setAliquotaSimples(aliq);
      }
    }
  }, [configuracoes]);

  const recalcularSimplesMutation = useMutation(
    trpc.financeiro.recalcularSimples.mutationOptions({
      onSuccess: (data) => {
        if (data.atualizados > 0) {
          toast.success(`${data.atualizados} lançamento(s) de Simples Nacional recalculado(s)`);
        }
        queryClient.invalidateQueries({ queryKey: [["financeiro"]] });
      },
      onError: (error) => toast.error(`Erro ao recalcular Simples: ${error.message}`),
    })
  );

  const salvarTaxasMutation = useMutation(
    trpc.configuracao.updateMany.mutationOptions({
      onSuccess: () => {
        toast.success("Taxas atualizadas com sucesso");
        queryClient.invalidateQueries({ queryKey: [["configuracao"]] });
        // Recalcular lançamentos de Simples Nacional existentes
        const novaAliquota = simplesAutomatico ? "auto" : aliquotaSimples;
        recalcularSimplesMutation.mutate({ novaAliquota });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const handleSalvarTaxas = () => {
    salvarTaxasMutation.mutate({
      configuracoes: [
        { chave: "TAXA_MDR", valor: taxaMDR },
        { chave: "ALIQUOTA_SIMPLES", valor: simplesAutomatico ? "auto" : aliquotaSimples },
      ],
    });
  };

  const { data: despesas, isLoading } = useQuery(
    trpc.financeiro.listDespesasRecorrentes.queryOptions()
  );

  const { data: contasAnaliticas } = useQuery(
    trpc.financeiro.listContasAnaliticas.queryOptions()
  );

  const contasDespesa = (contasAnaliticas ?? []).filter(
    (c) => c.codigo.startsWith("4")
  );

  const createMutation = useMutation(
    trpc.financeiro.createDespesaRecorrente.mutationOptions({
      onSuccess: () => {
        toast.success("Despesa recorrente criada");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listDespesasRecorrentes"]] });
        closeDialog();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const updateMutation = useMutation(
    trpc.financeiro.updateDespesaRecorrente.mutationOptions({
      onSuccess: () => {
        toast.success("Despesa recorrente atualizada");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listDespesasRecorrentes"]] });
        closeDialog();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.financeiro.deleteDespesaRecorrente.mutationOptions({
      onSuccess: () => {
        toast.success("Despesa recorrente excluida");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listDespesasRecorrentes"]] });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const executarMutation = useMutation(
    trpc.financeiro.executarDespesasRecorrentes.mutationOptions({
      onSuccess: (data) => {
        toast.success(`${data.quantidade} lancamentos criados para ${executeMes}/${executeAno}`);
        queryClient.invalidateQueries({ queryKey: [["financeiro"]] });
        setExecuteDialogOpen(false);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setNome("");
    setValor("");
    setContaContabilId("");
  };

  const openCreate = () => {
    closeDialog();
    setDialogOpen(true);
  };

  const openEdit = (d: { id: string; nome: string; valor: number | string; contaContabilId: string }) => {
    setEditingId(d.id);
    setNome(d.nome);
    setValor(String(d.valor));
    setContaContabilId(d.contaContabilId);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        nome,
        valor: parseFloat(valor),
        contaContabilId,
      });
    } else {
      createMutation.mutate({
        nome,
        valor: parseFloat(valor),
        contaContabilId,
      });
    }
  };

  const totalMensal = despesas
    ?.filter((d) => d.status === "ATIVA")
    .reduce((acc, d) => acc + Number(d.valor), 0) ?? 0;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Despesas Recorrentes</h1>
          <p className="text-muted-foreground">
            Despesas fixas com lancamento automatico no ultimo dia do mes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setExecuteDialogOpen(true)}
          >
            <Play className="h-4 w-4 mr-2" />
            Executar Mes
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Taxas e Impostos */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Taxas e Impostos</CardTitle>
          </div>
          <CardDescription>
            Configure as taxas aplicadas automaticamente nas vendas e na DRE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Taxa MDR */}
            <div className="space-y-2">
              <Label htmlFor="taxa-mdr">Taxa MDR (%)</Label>
              <Input
                id="taxa-mdr"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxaMDR}
                onChange={(e) => setTaxaMDR(e.target.value)}
                placeholder="4"
              />
              <p className="text-xs text-muted-foreground">
                Cobrada apenas em vendas com cartao de credito (a vista ou parcelado)
              </p>
            </div>

            {/* Alíquota Simples Nacional */}
            <div className="space-y-2">
              <Label htmlFor="aliquota-simples">Imposto sobre Receita (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="aliquota-simples"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={aliquotaSimples}
                  onChange={(e) => setAliquotaSimples(e.target.value)}
                  placeholder={simplesAutomatico ? "Automatico (RBT12)" : "Ex: 6"}
                  disabled={simplesAutomatico}
                  className={simplesAutomatico ? "opacity-50" : ""}
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Switch
                  id="simples-auto"
                  checked={simplesAutomatico}
                  onCheckedChange={(checked) => {
                    setSimplesAutomatico(checked);
                    if (checked) setAliquotaSimples("");
                  }}
                />
                <Label htmlFor="simples-auto" className="text-xs text-muted-foreground cursor-pointer">
                  Calculo automatico via RBT12
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Aliquota fixa do Simples Nacional aplicada sobre a receita na DRE. Ative o modo automatico para usar o calculo via RBT12.
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleSalvarTaxas}
              disabled={salvarTaxasMutation.isPending || recalcularSimplesMutation.isPending}
              size="sm"
            >
              {salvarTaxasMutation.isPending || recalcularSimplesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {recalcularSimplesMutation.isPending ? "Recalculando..." : "Salvar Taxas"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm text-muted-foreground">Total Mensal (ativas)</p>
              <p className="text-2xl font-bold">{formatCurrency(totalMensal)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Despesas ativas</p>
              <p className="text-2xl font-bold">
                {despesas?.filter((d) => d.status === "ATIVA").length ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Conta Contabil</TableHead>
                <TableHead className="text-right">Valor Mensal</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas && despesas.length > 0 ? (
                despesas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.contaContabil.codigo} — {d.contaContabil.nome}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(d.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={d.status === "ATIVA" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {d.status === "ATIVA" ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() =>
                            openEdit({
                              id: d.id,
                              nome: d.nome,
                              valor: d.valor,
                              contaContabilId: d.contaContabil.id,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => {
                            if (confirm(`Excluir despesa "${d.nome}"?`)) {
                              deleteMutation.mutate({ id: d.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma despesa recorrente cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Despesa" : "Nova Despesa Recorrente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Contabilidade"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Mensal (R$)</Label>
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
              <Label>Conta Contabil</Label>
              <Select value={contaContabilId} onValueChange={setContaContabilId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasDespesa.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} — {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog executar mês */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Executar Despesas Recorrentes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Isso criara lancamentos automaticos para todas as despesas ativas no ultimo dia do mes selecionado.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select
                  value={String(executeMes)}
                  onValueChange={(v) => setExecuteMes(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={executeAno}
                  onChange={(e) => setExecuteAno(parseInt(e.target.value))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExecuteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => executarMutation.mutate({ mes: executeMes, ano: executeAno })}
                disabled={executarMutation.isPending}
              >
                {executarMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Executar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
