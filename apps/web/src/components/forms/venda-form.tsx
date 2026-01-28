"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Search, Check } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

interface VendaData {
  pecaId: string;
  clienteId: string;
  valorDesconto: string;
  formaPagamento: "PIX" | "CREDITO_VISTA" | "CREDITO_PARCELADO";
  parcelas: string;
  pagamentoInicial: string;
}

const defaultData: VendaData = {
  pecaId: "",
  clienteId: "",
  valorDesconto: "",
  formaPagamento: "PIX",
  parcelas: "",
  pagamentoInicial: "",
};

export function VendaForm() {
  const router = useRouter();
  const [data, setData] = useState<VendaData>(defaultData);
  const [pecaSearch, setPecaSearch] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [showPecaList, setShowPecaList] = useState(false);
  const [showClienteList, setShowClienteList] = useState(false);

  // Buscar pecas disponiveis
  const { data: pecas } = useQuery({
    ...trpc.peca.list.queryOptions({
      page: 1,
      limit: 10,
      search: pecaSearch || undefined,
      status: "DISPONIVEL",
    }),
    enabled: pecaSearch.length > 1,
  });

  // Buscar peca selecionada
  const { data: pecaSelecionada } = useQuery({
    ...trpc.peca.getById.queryOptions({ id: data.pecaId }),
    enabled: !!data.pecaId,
  });

  // Buscar clientes
  const { data: clientes } = useQuery({
    ...trpc.cliente.list.queryOptions({
      page: 1,
      limit: 10,
      search: clienteSearch || undefined,
    }),
    enabled: clienteSearch.length > 1,
  });

  // Buscar cliente selecionado
  const { data: clienteSelecionado } = useQuery({
    ...trpc.cliente.getById.queryOptions({ id: data.clienteId }),
    enabled: !!data.clienteId,
  });

  const createMutation = useMutation({
    ...trpc.venda.create.mutationOptions(),
    onSuccess: (venda) => {
      toast.success("Venda registrada com sucesso!");
      router.push(`/vendas/${venda.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleChange = (field: keyof VendaData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const valorOriginal = pecaSelecionada?.valorEstimadoVenda
    ? Number(pecaSelecionada.valorEstimadoVenda)
    : 0;
  const desconto = parseFloat(data.valorDesconto) || 0;
  const valorFinal = valorOriginal - desconto;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!data.pecaId) {
      toast.error("Selecione uma peca");
      return;
    }

    if (!data.clienteId) {
      toast.error("Selecione um cliente");
      return;
    }

    createMutation.mutate({
      pecaId: data.pecaId,
      clienteId: data.clienteId,
      valorDesconto: desconto || undefined,
      formaPagamento: data.formaPagamento,
      parcelas: data.parcelas ? parseInt(data.parcelas, 10) : undefined,
      pagamentoInicial: data.pagamentoInicial
        ? parseFloat(data.pagamentoInicial)
        : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selecao de Peca */}
      <Card>
        <CardHeader>
          <CardTitle>Peca *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pecaSelecionada ? (
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              {pecaSelecionada.fotos?.[0] && (
                <img
                  src={pecaSelecionada.fotos[0].url}
                  alt={pecaSelecionada.sku}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{pecaSelecionada.sku}</span>
                  <StatusBadge type="peca" status={pecaSelecionada.status} size="sm" />
                </div>
                <p className="text-muted-foreground">
                  {pecaSelecionada.marca} {pecaSelecionada.modelo}
                </p>
                {pecaSelecionada.valorEstimadoVenda && (
                  <p className="font-medium mt-1">
                    {formatCurrency(Number(pecaSelecionada.valorEstimadoVenda))}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleChange("pecaId", "");
                  setShowPecaList(true);
                }}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={pecaSearch}
                  onChange={(e) => {
                    setPecaSearch(e.target.value);
                    setShowPecaList(true);
                  }}
                  onFocus={() => setShowPecaList(true)}
                  placeholder="Buscar por SKU, marca ou modelo..."
                  className="pl-9"
                />
              </div>

              {showPecaList && pecas && pecas.pecas.length > 0 && (
                <div className="border rounded-lg divide-y max-h-64 overflow-auto">
                  {pecas.pecas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full p-3 text-left hover:bg-muted/50 flex items-center gap-3"
                      onClick={() => {
                        handleChange("pecaId", p.id);
                        setShowPecaList(false);
                        setPecaSearch("");
                      }}
                    >
                      {p.fotos[0] && (
                        <img
                          src={p.fotos[0].url}
                          alt={p.sku}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-mono text-sm">{p.sku}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.marca} {p.modelo}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selecao de Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Cliente *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {clienteSelecionado ? (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{clienteSelecionado.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {clienteSelecionado.cidade}/{clienteSelecionado.estado}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleChange("clienteId", "");
                  setShowClienteList(true);
                }}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setShowClienteList(true);
                  }}
                  onFocus={() => setShowClienteList(true)}
                  placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                  className="pl-9"
                />
              </div>

              {showClienteList && clientes && clientes.clientes.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                  {clientes.clientes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full p-3 text-left hover:bg-muted/50"
                      onClick={() => {
                        handleChange("clienteId", c.id);
                        setShowClienteList(false);
                        setClienteSearch("");
                      }}
                    >
                      <p className="font-medium">{c.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.cidade}/{c.estado}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push("/clientes/novo")}
              >
                + Cadastrar novo cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Valores e Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Valores e Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Valor Original</Label>
              <div className="p-2 bg-muted rounded text-lg font-medium">
                {formatCurrency(valorOriginal)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorDesconto">Desconto (R$)</Label>
              <Input
                id="valorDesconto"
                type="number"
                step="0.01"
                min="0"
                max={valorOriginal}
                value={data.valorDesconto}
                onChange={(e) => handleChange("valorDesconto", e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Final</Label>
              <div className="p-2 bg-green-100 text-green-800 rounded text-lg font-bold">
                {formatCurrency(valorFinal)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
              <Select
                value={data.formaPagamento}
                onValueChange={(value) => handleChange("formaPagamento", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CREDITO_VISTA">Credito a Vista</SelectItem>
                  <SelectItem value="CREDITO_PARCELADO">Credito Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {data.formaPagamento === "CREDITO_PARCELADO" && (
              <div className="space-y-2">
                <Label htmlFor="parcelas">Parcelas</Label>
                <Select
                  value={data.parcelas}
                  onValueChange={(value) => handleChange("parcelas", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}x de {formatCurrency(valorFinal / n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pagamentoInicial">Pagamento Inicial (R$)</Label>
            <Input
              id="pagamentoInicial"
              type="number"
              step="0.01"
              min="0"
              max={valorFinal}
              value={data.pagamentoInicial}
              onChange={(e) => handleChange("pagamentoInicial", e.target.value)}
              placeholder="Deixe em branco para registrar depois"
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Registre o valor recebido no momento da venda.
            </p>
          </div>

          {pecaSelecionada?.origemTipo === "CONSIGNACAO" && pecaSelecionada.valorRepasse && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm text-amber-800">
                <strong>Peca em consignacao.</strong> Repasse de{" "}
                {formatCurrency(Number(pecaSelecionada.valorRepasse))} sera
                registrado como pendente para o fornecedor.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botoes */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={createMutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Registrar Venda
        </Button>
      </div>
    </form>
  );
}
