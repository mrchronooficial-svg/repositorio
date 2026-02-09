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

interface PagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
  saldoDevedor: number;
  onSuccess?: () => void;
}

export function PagamentoDialog({
  open,
  onOpenChange,
  vendaId,
  saldoDevedor,
  onSuccess,
}: PagamentoDialogProps) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");

  const mutation = useMutation(
    trpc.venda.registrarPagamento.mutationOptions({
      onSuccess: () => {
        toast.success("Pagamento registrado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["venda", "getById"] });
        onOpenChange(false);
        setValor("");
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

    if (valorNum > saldoDevedor) {
      toast.error(`Valor excede o saldo devedor de ${formatCurrency(saldoDevedor)}`);
      return;
    }

    mutation.mutate({
      vendaId,
      valor: valorNum,
    });
  };

  const pagarTotal = () => {
    setValor(saldoDevedor.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Saldo devedor: {formatCurrency(saldoDevedor)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="valor">Valor do Pagamento (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              max={saldoDevedor}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={pagarTotal}
          >
            Pagar valor total ({formatCurrency(saldoDevedor)})
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
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
