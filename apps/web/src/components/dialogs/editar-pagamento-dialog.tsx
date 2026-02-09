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

interface EditarPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamentoId: string;
  valorAtual: number;
  onSuccess?: () => void;
}

export function EditarPagamentoDialog({
  open,
  onOpenChange,
  pagamentoId,
  valorAtual,
  onSuccess,
}: EditarPagamentoDialogProps) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (open) {
      setValor(valorAtual.toFixed(2));
    }
  }, [open, valorAtual]);

  const mutation = useMutation(
    trpc.venda.editarPagamento.mutationOptions({
      onSuccess: () => {
        toast.success("Pagamento atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["venda", "getById"] });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = () => {
    const valorNum = parseFloat(valor);

    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Informe um valor valido");
      return;
    }

    mutation.mutate({
      pagamentoId,
      valor: valorNum,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Pagamento</DialogTitle>
          <DialogDescription>
            Valor atual: {formatCurrency(valorAtual)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="valorEditar">Novo Valor (R$)</Label>
            <Input
              id="valorEditar"
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
