"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { trpc } from "@/utils/trpc";

interface ContaBancaria {
  id: string;
  nome: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  contaContabilId: string;
  contaContabil: { id: string; codigo: string; nome: string };
  saldoInicial: number | string;
  ativa: boolean;
}

interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
}

interface ContaBancariaSectionProps {
  contasBancarias: ContaBancaria[];
  isLoading: boolean;
  contasContabeis: ContaContabil[];
}

export function ContaBancariaSection({
  contasBancarias,
  isLoading,
  contasContabeis,
}: ContaBancariaSectionProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContaBancaria | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [contaContabilId, setContaContabilId] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");

  // Contas contabeis analiticas do grupo Caixa (1.1.1.*)
  const contasCaixa = contasContabeis.filter(
    (c) => c.tipo === "ANALITICA" && c.codigo.startsWith("1.1.1")
  );

  const createMutation = useMutation(
    trpc.financeiro.createContaBancaria.mutationOptions({
      onSuccess: () => {
        toast.success("Conta bancaria criada com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listContasBancarias"]] });
        closeDialog();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.financeiro.updateContaBancaria.mutationOptions({
      onSuccess: () => {
        toast.success("Conta bancaria atualizada");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listContasBancarias"]] });
        closeDialog();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setBanco("");
    setAgencia("");
    setConta("");
    setContaContabilId("");
    setSaldoInicial("");
    setDialogOpen(true);
  };

  const openEdit = (cb: ContaBancaria) => {
    setEditing(cb);
    setNome(cb.nome);
    setBanco(cb.banco);
    setAgencia(cb.agencia ?? "");
    setConta(cb.conta ?? "");
    setContaContabilId(cb.contaContabilId);
    setSaldoInicial(String(cb.saldoInicial));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        nome,
        banco,
        agencia: agencia || null,
        conta: conta || null,
        saldoInicial: saldoInicial ? parseFloat(saldoInicial) : undefined,
      });
    } else {
      createMutation.mutate({
        nome,
        banco,
        agencia: agencia || null,
        conta: conta || null,
        contaContabilId,
        saldoInicial: saldoInicial ? parseFloat(saldoInicial) : 0,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contasBancarias.length > 0 ? (
        <div className="space-y-3">
          {contasBancarias.map((cb) => (
            <div
              key={cb.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cb.nome}</span>
                    <Badge variant={cb.ativa ? "default" : "secondary"} className="text-[10px]">
                      {cb.ativa ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {cb.banco}
                    {cb.agencia && ` | Ag: ${cb.agencia}`}
                    {cb.conta && ` | Cc: ${cb.conta}`}
                    {" | "}
                    Conta: {cb.contaContabil.codigo} — {cb.contaContabil.nome}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Saldo inicial</p>
                  <p className="font-medium">{formatCurrency(cb.saldoInicial)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(cb)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma conta bancaria cadastrada.
        </p>
      )}

      <Button variant="outline" size="sm" onClick={openCreate}>
        <Plus className="h-4 w-4 mr-2" />
        Nova Conta Bancaria
      </Button>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Conta Bancaria" : "Nova Conta Bancaria"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cb-nome">Nome</Label>
                <Input
                  id="cb-nome"
                  placeholder="Ex: Nubank PJ"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-banco">Banco</Label>
                <Input
                  id="cb-banco"
                  placeholder="Ex: Nubank"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cb-agencia">Agencia</Label>
                <Input
                  id="cb-agencia"
                  placeholder="Opcional"
                  value={agencia}
                  onChange={(e) => setAgencia(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb-conta">Conta</Label>
                <Input
                  id="cb-conta"
                  placeholder="Opcional"
                  value={conta}
                  onChange={(e) => setConta(e.target.value)}
                />
              </div>
            </div>

            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="cb-contaContabil">Conta Contabil Vinculada</Label>
                <Select value={contaContabilId} onValueChange={setContaContabilId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasCaixa.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigo} — {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cb-saldo">Saldo Inicial (R$)</Label>
              <Input
                id="cb-saldo"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !nome || !banco || (!editing && !contaContabilId)}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
