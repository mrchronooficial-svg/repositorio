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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

interface PagamentoFornecedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pecaId: string;
  sku: string;
  valorCompra: number;
  valorPago: number;
  origemTipo: "COMPRA" | "CONSIGNACAO";
  statusPeca: string;
  onSuccess?: () => void;
}

// Este dialog e apenas para pecas COMPRADAS (nao consignadas)
// Pecas consignadas tem repasse gerenciado na venda
export function PagamentoFornecedorDialog({
  open,
  onOpenChange,
  pecaId,
  sku,
  valorCompra,
  valorPago,
  origemTipo,
  statusPeca,
  onSuccess,
}: PagamentoFornecedorDialogProps) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [observacao, setObservacao] = useState("");

  // Garantir que os valores são números válidos
  const valorCompraNum = isNaN(valorCompra) ? 0 : valorCompra;
  const valorPagoNum = isNaN(valorPago) ? 0 : valorPago;
  const valorRestante = valorCompraNum - valorPagoNum;

  useEffect(() => {
    if (open) {
      setValor("");
      setData(new Date().toISOString().split("T")[0]);
      setObservacao("");
    }
  }, [open]);

  const mutation = useMutation({
    ...trpc.peca.registrarPagamentoFornecedor.mutationOptions(),
    onSuccess: () => {
      toast.success("Pagamento registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["peca", "getById"] });
      queryClient.invalidateQueries({ queryKey: ["peca", "list"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    const valorNum = parseFloat(valor.replace(",", "."));

    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Valor invalido");
      return;
    }

    if (valorNum > valorRestante) {
      toast.error(`Valor excede o restante (${formatCurrency(valorRestante)})`);
      return;
    }

    mutation.mutate({
      pecaId,
      valor: valorNum,
      data,
      observacao: observacao || undefined,
    });
  };

  const handlePagarTotal = () => {
    setValor(valorRestante.toFixed(2).replace(".", ","));
  };

  const isConsignacaoNaoVendida = origemTipo === "CONSIGNACAO" && statusPeca !== "VENDIDA";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pagamento ao Fornecedor</DialogTitle>
          <DialogDescription>
            Peca: {sku}
          </DialogDescription>
        </DialogHeader>

        {isConsignacaoNaoVendida ? (
          <div className="py-4">
            <p className="text-amber-600 bg-amber-50 p-4 rounded-lg">
              Pecas consignadas nao tem pagamento ao fornecedor. O repasse e
              gerenciado atraves da venda, apos a peca ser vendida.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="font-medium">{formatCurrency(valorCompra)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ja Pago</p>
                <p className="font-medium text-green-600">{formatCurrency(valorPago)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Restante</p>
                <p className="font-medium text-orange-600">{formatCurrency(valorRestante)}</p>
              </div>
            </div>

            {valorRestante > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="valor">Valor do Pagamento *</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={handlePagarTotal}
                      className="h-auto p-0"
                    >
                      Pagar total restante
                    </Button>
                  </div>
                  <Input
                    id="valor"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data">Data do Pagamento</Label>
                  <Input
                    id="data"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacao">Observacao (opcional)</Label>
                  <Textarea
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Transferencia PIX, Dinheiro, etc."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">
                  Pagamento completo! Nao ha valor pendente.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {valorRestante <= 0 || isConsignacaoNaoVendida ? "Fechar" : "Cancelar"}
          </Button>
          {valorRestante > 0 && !isConsignacaoNaoVendida && (
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Registrar Pagamento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
