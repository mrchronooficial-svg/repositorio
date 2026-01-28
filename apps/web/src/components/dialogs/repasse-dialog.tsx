"use client";

import { useState } from "react";
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

interface RepasseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
  valorDevido: number;
  valorFeito: number;
  fornecedorNome: string;
  onSuccess?: () => void;
}

export function RepasseDialog({
  open,
  onOpenChange,
  vendaId,
  valorDevido,
  valorFeito,
  fornecedorNome,
  onSuccess,
}: RepasseDialogProps) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");

  const saldoRepasse = valorDevido - valorFeito;

  const mutation = useMutation({
    ...trpc.venda.registrarRepasse.mutationOptions(),
    onSuccess: () => {
      toast.success("Repasse registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["venda", "getById"] });
      onOpenChange(false);
      setValor("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    const valorNum = parseFloat(valor);

    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Informe um valor valido");
      return;
    }

    if (valorNum > saldoRepasse) {
      toast.error(`Valor excede o saldo de repasse de ${formatCurrency(saldoRepasse)}`);
      return;
    }

    mutation.mutate({
      vendaId,
      valor: valorNum,
    });
  };

  const repassarTotal = () => {
    setValor(saldoRepasse.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Repasse</DialogTitle>
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
              <p className="text-muted-foreground">Ja repassado</p>
              <p className="font-medium">{formatCurrency(valorFeito)}</p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800">
              Saldo pendente: <strong>{formatCurrency(saldoRepasse)}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor do Repasse (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              max={saldoRepasse}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={repassarTotal}
          >
            Repassar valor total ({formatCurrency(saldoRepasse)})
          </Button>
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
            Registrar Repasse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
