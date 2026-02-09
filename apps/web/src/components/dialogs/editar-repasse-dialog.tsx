"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

interface EditarRepasseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
  valorDevido: number;
  valorFeito: number;
  fornecedorNome: string;
  onSuccess?: () => void;
}

export function EditarRepasseDialog({
  open,
  onOpenChange,
  vendaId,
  valorDevido,
  valorFeito,
  fornecedorNome,
  onSuccess,
}: EditarRepasseDialogProps) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (open) {
      setValor(valorFeito.toFixed(2));
    }
  }, [open, valorFeito]);

  const editMutation = useMutation(
    trpc.venda.editarRepasse.mutationOptions({
      onSuccess: () => {
        toast.success("Repasse atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["venda", "getById"] });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const resetMutation = useMutation(
    trpc.venda.resetarRepasse.mutationOptions({
      onSuccess: () => {
        toast.success("Repasse zerado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["venda", "getById"] });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const isPending = editMutation.isPending || resetMutation.isPending;

  const handleSubmit = () => {
    const valorNum = parseFloat(valor);

    if (isNaN(valorNum) || valorNum < 0) {
      toast.error("Informe um valor valido");
      return;
    }

    if (valorNum > valorDevido) {
      toast.error(`Valor excede o repasse devido de ${formatCurrency(valorDevido)}`);
      return;
    }

    editMutation.mutate({
      vendaId,
      valorRepasseFeito: valorNum,
    });
  };

  const handleReset = () => {
    if (confirm("Tem certeza que deseja zerar o valor repassado?")) {
      resetMutation.mutate({ vendaId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Repasse</DialogTitle>
          <DialogDescription>
            Repasse para: {fornecedorNome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Valor devido</p>
              <p className="font-medium">{formatCurrency(valorDevido)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor repassado atual</p>
              <p className="font-medium">{formatCurrency(valorFeito)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorRepasse">Novo Valor Repassado (R$)</Label>
            <Input
              id="valorRepasse"
              type="number"
              step="0.01"
              min="0"
              max={valorDevido}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">
              Ajuste o valor total ja repassado ao fornecedor.
            </p>
          </div>

          {valorFeito > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleReset}
              disabled={isPending}
            >
              Zerar repasse (voltar para Pendente)
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
