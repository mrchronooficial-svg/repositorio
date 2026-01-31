"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Search, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ClienteModal } from "./cliente-modal";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

interface VendaData {
  pecaId: string;
  clienteId: string;
  valorFinal: string;
  formaPagamento: "PIX" | "CREDITO_VISTA" | "CREDITO_PARCELADO";
  parcelas: string;
  pagamentoInicial: string;
  observacaoLogistica: string;
}

const defaultData: VendaData = {
  pecaId: "",
  clienteId: "",
  valorFinal: "",
  formaPagamento: "PIX",
  parcelas: "",
  pagamentoInicial: "",
  observacaoLogistica: "",
};

export function VendaForm() {
  const router = useRouter();
  const [data, setData] = useState<VendaData>(defaultData);
  const [pecaSearch, setPecaSearch] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [showPecaList, setShowPecaList] = useState(false);
  const [showClienteList, setShowClienteList] = useState(false);
  const [showClienteModal, setShowClienteModal] = useState(false);

  const pecaDropdownRef = useRef<HTMLDivElement>(null);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pecaDropdownRef.current && !pecaDropdownRef.current.contains(event.target as Node)) {
        setShowPecaList(false);
      }
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(event.target as Node)) {
        setShowClienteList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscar pecas disponiveis para venda (DISPONIVEL ou EM_TRANSITO)
  const { data: pecas, isLoading: isLoadingPecas } = useQuery({
    ...trpc.peca.listParaVenda.queryOptions({
      page: 1,
      limit: 20,
      search: pecaSearch.trim() || undefined,
    }),
    enabled: showPecaList, // Busca quando o dropdown está aberto
  });

  // Buscar peca selecionada
  const { data: pecaSelecionada } = useQuery({
    ...trpc.peca.getById.queryOptions({ id: data.pecaId }),
    enabled: !!data.pecaId,
  });

  // Buscar clientes
  const { data: clientes, isLoading: isLoadingClientes } = useQuery({
    ...trpc.cliente.list.queryOptions({
      page: 1,
      limit: 20,
      search: clienteSearch.trim() || undefined,
    }),
    enabled: showClienteList, // Busca quando o dropdown está aberto
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

  // Valor final digitado pelo usuário (ou valor original se não preenchido)
  const valorFinal = data.valorFinal ? parseFloat(data.valorFinal) : valorOriginal;
  // Desconto é calculado automaticamente
  const desconto = valorOriginal - valorFinal;

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
      valorDesconto: desconto > 0 ? desconto : undefined,
      formaPagamento: data.formaPagamento,
      parcelas: data.parcelas ? parseInt(data.parcelas, 10) : undefined,
      pagamentoInicial: data.pagamentoInicial
        ? parseFloat(data.pagamentoInicial)
        : undefined,
      observacaoLogistica: data.observacaoLogistica || undefined,
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
            <div className="space-y-2 relative" ref={pecaDropdownRef}>
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

              {showPecaList && (
                <div className="absolute z-50 w-full mt-1 border rounded-lg bg-popover shadow-lg max-h-72 overflow-auto">
                  {isLoadingPecas ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Carregando peças...</span>
                    </div>
                  ) : pecas && pecas.pecas.length > 0 ? (
                    <div className="divide-y">
                      {pecas.pecas.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full p-3 text-left hover:bg-accent transition-colors flex items-center gap-3"
                          onClick={() => {
                            handleChange("pecaId", p.id);
                            setShowPecaList(false);
                            setPecaSearch("");
                          }}
                        >
                          {p.fotos[0] ? (
                            <img
                              src={p.fotos[0].url}
                              alt={p.sku}
                              className="w-12 h-12 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-medium">{p.sku}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {p.marca} {p.modelo}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-sm">Nenhuma peça disponível encontrada</span>
                      {pecaSearch && (
                        <span className="text-xs mt-1">Tente outro termo de busca</span>
                      )}
                    </div>
                  )}
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
            <div className="space-y-2 relative" ref={clienteDropdownRef}>
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

              {showClienteList && (
                <div className="absolute z-50 w-full mt-1 border rounded-lg bg-popover shadow-lg max-h-64 overflow-auto">
                  {isLoadingClientes ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Carregando clientes...</span>
                    </div>
                  ) : clientes && clientes.clientes.length > 0 ? (
                    <div className="divide-y">
                      {clientes.clientes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full p-3 text-left hover:bg-accent transition-colors"
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
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <span className="text-sm">Nenhum cliente encontrado</span>
                      {clienteSearch && (
                        <span className="text-xs mt-1">Tente outro termo de busca</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => setShowClienteModal(true)}
              >
                + Cadastrar novo cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cliente */}
      <ClienteModal
        open={showClienteModal}
        onOpenChange={setShowClienteModal}
        onSuccess={(cliente) => {
          handleChange("clienteId", cliente.id);
          setShowClienteList(false);
          setClienteSearch("");
        }}
      />

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
              <Label htmlFor="valorFinal">Valor Final (R$) *</Label>
              <Input
                id="valorFinal"
                type="number"
                step="0.01"
                min="0"
                max={valorOriginal * 2}
                value={data.valorFinal}
                onChange={(e) => handleChange("valorFinal", e.target.value)}
                placeholder={valorOriginal.toFixed(2)}
              />
              <p className="text-xs text-muted-foreground">
                Valor negociado com o cliente
              </p>
            </div>

            <div className="space-y-2">
              <Label>Desconto</Label>
              <div className={`p-2 rounded text-lg font-bold ${
                desconto > 0
                  ? "bg-amber-100 text-amber-800"
                  : desconto < 0
                    ? "bg-green-100 text-green-800"
                    : "bg-muted text-muted-foreground"
              }`}>
                {desconto > 0
                  ? `- ${formatCurrency(desconto)}`
                  : desconto < 0
                    ? `+ ${formatCurrency(Math.abs(desconto))}`
                    : formatCurrency(0)
                }
              </div>
              {desconto > 0 && (
                <p className="text-xs text-amber-600">
                  {((desconto / valorOriginal) * 100).toFixed(1)}% de desconto
                </p>
              )}
              {desconto < 0 && (
                <p className="text-xs text-green-600">
                  {((Math.abs(desconto) / valorOriginal) * 100).toFixed(1)}% acima do valor
                </p>
              )}
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
                        {n}x de {formatCurrency((valorFinal || valorOriginal) / n)}
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
              max={valorFinal || valorOriginal}
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

      {/* Observacao de Logistica */}
      <Card>
        <CardHeader>
          <CardTitle>Logistica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="observacaoLogistica">Observacao para Envio</Label>
            <Textarea
              id="observacaoLogistica"
              value={data.observacaoLogistica}
              onChange={(e) => handleChange("observacaoLogistica", e.target.value)}
              placeholder="Ex: Cliente solicitou envio expresso, entregar em maos, etc."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Esta observacao aparecera na aba de logistica.
            </p>
          </div>
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
