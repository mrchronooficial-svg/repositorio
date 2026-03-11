"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

interface DropItemData {
  id: string;
  pecaId: string;
  dropPrice: unknown;
  originalPrice: unknown;
  peca: {
    id: string;
    sku: string;
    marca: string;
    modelo: string;
    fotos: { id: string; url: string }[];
  };
}

interface ClienteResult {
  id: string;
  nome: string;
  cpfCnpj: string;
  tipo: string;
}

interface MarkAsSoldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DropItemData;
}

export function MarkAsSoldModal({
  open,
  onOpenChange,
  item,
}: MarkAsSoldModalProps) {
  const queryClient = useQueryClient();

  const [clienteId, setClienteId] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteResult | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<string>("");
  const [parcelas, setParcelas] = useState(1);
  const [valorDesconto, setValorDesconto] = useState<number | undefined>(undefined);

  const { data: clientesData } = useQuery(
    trpc.cliente.list.queryOptions(
      { page: 1, limit: 10, search: clienteSearch, arquivado: false },
      { enabled: showClienteSearch && clienteSearch.length >= 2 }
    )
  );

  const clientes = (
    clientesData as { clientes: ClienteResult[]; total: number } | undefined
  )?.clientes ?? [];

  const vendaMutation = useMutation(
    trpc.venda.create.mutationOptions({
      onSuccess: (result) => {
        const vendaResult = result as { id: string };
        markSoldMutation.mutate({
          dropItemId: item.id,
          vendaId: vendaResult.id,
        });
      },
      onError: (error: { message: string }) => {
        toast.error("Erro ao registrar venda: " + error.message);
      },
    })
  );

  const markSoldMutation = useMutation(
    trpc.drop.markItemSold.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.drop.list.queryKey() });
        toast.success("Peça marcada como vendida");
        resetForm();
        onOpenChange(false);
      },
      onError: (error: { message: string }) => {
        toast.error("Erro ao marcar como vendido: " + error.message);
      },
    })
  );

  function resetForm() {
    setClienteId("");
    setClienteSearch("");
    setSelectedCliente(null);
    setFormaPagamento("");
    setParcelas(1);
    setValorDesconto(undefined);
  }

  function handleSelectCliente(cliente: ClienteResult) {
    setClienteId(cliente.id);
    setSelectedCliente(cliente);
    setClienteSearch("");
    setShowClienteSearch(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clienteId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!formaPagamento) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    const payload: {
      pecaId: string;
      clienteId: string;
      formaPagamento: "PIX" | "CREDITO_VISTA" | "CREDITO_PARCELADO";
      parcelas?: number;
      valorDesconto?: number;
    } = {
      pecaId: item.pecaId,
      clienteId,
      formaPagamento: formaPagamento as "PIX" | "CREDITO_VISTA" | "CREDITO_PARCELADO",
    };

    if (formaPagamento === "CREDITO_PARCELADO" && parcelas > 1) {
      payload.parcelas = parcelas;
    }

    if (valorDesconto !== undefined && valorDesconto > 0) {
      payload.valorDesconto = valorDesconto;
    }

    vendaMutation.mutate(payload);
  }

  const isPending = vendaMutation.isPending || markSoldMutation.isPending;
  const fotoUrl = item.peca?.fotos?.[0]?.url;
  const dropPrice = Number(item.dropPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Venda</DialogTitle>
        </DialogHeader>

        {/* Piece info */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={`${item.peca.marca} ${item.peca.modelo}`}
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-sm">
              {item.peca?.marca} {item.peca?.modelo}
            </p>
            <p className="text-xs text-muted-foreground">{item.peca?.sku}</p>
            <p className="text-sm font-semibold mt-0.5">
              {dropPrice.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client selector */}
          <div>
            <Label>Cliente</Label>
            {selectedCliente ? (
              <div className="flex items-center justify-between p-2 border rounded-md mt-1">
                <div>
                  <p className="text-sm font-medium">{selectedCliente.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCliente.cpfCnpj}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCliente(null);
                    setClienteId("");
                  }}
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <div className="relative mt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                    className="pl-9"
                    value={clienteSearch}
                    onFocus={() => setShowClienteSearch(true)}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      setShowClienteSearch(true);
                    }}
                  />
                </div>
                {showClienteSearch && clienteSearch.length >= 2 && clientes.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        className="w-full flex flex-col p-3 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => handleSelectCliente(cliente)}
                      >
                        <p className="text-sm font-medium">{cliente.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {cliente.cpfCnpj}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {showClienteSearch && clienteSearch.length >= 2 && clientes.length === 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discount */}
          <div>
            <Label htmlFor="valorDesconto">Desconto (opcional)</Label>
            <Input
              id="valorDesconto"
              type="number"
              step="0.01"
              min={0}
              placeholder="0,00"
              value={valorDesconto ?? ""}
              onChange={(e) =>
                setValorDesconto(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>

          {/* Payment method */}
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CREDITO_VISTA">Crédito à Vista</SelectItem>
                <SelectItem value="CREDITO_PARCELADO">
                  Crédito Parcelado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Parcelas */}
          {formaPagamento === "CREDITO_PARCELADO" && (
            <div>
              <Label htmlFor="parcelas">Parcelas</Label>
              <Input
                id="parcelas"
                type="number"
                min={2}
                max={12}
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Registrando..." : "Confirmar Venda"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
