"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Truck, Clock, Search, Check, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

function calcularDiasDesdeVenda(dataVenda: Date | string): number {
  const venda = new Date(dataVenda);
  const hoje = new Date();
  const diffTime = Math.abs(hoje.getTime() - venda.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatarData(data: Date | string): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

export default function LogisticaPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusEnvio, setStatusEnvio] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<{ url: string; sku: string } | null>(null);

  // Estado para modal de envio
  const [envioModal, setEnvioModal] = useState<{ vendaId: string; sku: string } | null>(null);
  const [codigoRastreio, setCodigoRastreio] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"RETIRADA_PESSOALMENTE" | "ENTREGA_RJ" | null>(null);

  const queryOptions = trpc.logistica.list.queryOptions({
    page,
    limit: 20,
    search: search || undefined,
    statusEnvio: statusEnvio !== "all" ? (statusEnvio as "PENDENTE" | "ENVIADO") : undefined,
  });

  const { data, isLoading } = useQuery(queryOptions);

  const metricasOptions = trpc.logistica.getMetricas.queryOptions();
  const { data: metricas } = useQuery(metricasOptions);

  const marcarEnviadoMutation = useMutation({
    ...trpc.logistica.marcarEnviado.mutationOptions(),
    onSuccess: () => {
      toast.success("Marcado como enviado!");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: metricasOptions.queryKey });
      fecharModalEnvio();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const desfazerEnvioMutation = useMutation({
    ...trpc.logistica.desfazerEnvio.mutationOptions(),
    onSuccess: () => {
      toast.success("Envio desfeito!");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: metricasOptions.queryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const abrirModalEnvio = (vendaId: string, sku: string) => {
    setEnvioModal({ vendaId, sku });
    setCodigoRastreio("");
    setTipoEntrega(null);
  };

  const fecharModalEnvio = () => {
    setEnvioModal(null);
    setCodigoRastreio("");
    setTipoEntrega(null);
  };

  const handleConfirmarEnvio = () => {
    if (!envioModal) return;

    // Validação: só pode não ter código se tiver tipo de entrega selecionado
    if (!codigoRastreio.trim() && !tipoEntrega) {
      toast.error("Informe o código de rastreio ou selecione uma opção de entrega");
      return;
    }

    marcarEnviadoMutation.mutate({
      vendaId: envioModal.vendaId,
      codigoRastreio: codigoRastreio.trim() || undefined,
      tipoEntrega: tipoEntrega || undefined,
    });
  };

  const handleDesfazerEnvio = (vendaId: string) => {
    desfazerEnvioMutation.mutate({ vendaId });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Logistica" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logistica</h1>
          <p className="text-muted-foreground">
            Gerenciamento de envios de pecas vendidas
          </p>
        </div>
      </div>

      {/* Cards de metricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes de Envio</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metricas?.pendentes ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando envio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados Hoje</CardTitle>
            <Truck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metricas?.enviadosHoje ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Pecas despachadas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.total ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Todas as vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU ou cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusEnvio}
              onValueChange={(value) => {
                setStatusEnvio(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="ENVIADO">Enviado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.vendas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda encontrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Foto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CEP</TableHead>
                  <TableHead>Localizacao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rastreio</TableHead>
                  <TableHead>Observacao</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.vendas.map((venda) => {
                  const dias = calcularDiasDesdeVenda(venda.dataVenda);
                  const isAtrasado = dias >= 3 && venda.statusEnvio === "PENDENTE";

                  return (
                    <TableRow key={venda.id} className={isAtrasado ? "bg-red-50" : ""}>
                      <TableCell className="py-2">
                        {venda.peca.fotos?.[0] ? (
                          <img
                            src={venda.peca.fotos[0].url}
                            alt={venda.peca.sku}
                            className="h-16 w-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImage({ url: venda.peca.fotos[0].url, sku: venda.peca.sku })}
                            title="Clique para ampliar"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            Sem foto
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-medium">{venda.peca.sku}</div>
                        <div className="text-xs text-muted-foreground">
                          {venda.peca.marca} {venda.peca.modelo}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${isAtrasado ? "text-red-600" : ""}`}>
                          {dias} {dias === 1 ? "dia" : "dias"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatarData(venda.dataVenda)}
                        </div>
                      </TableCell>
                      <TableCell>{venda.cliente.nome}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {venda.cliente.cep ? `${venda.cliente.cep.slice(0, 5)}-${venda.cliente.cep.slice(5)}` : "-"}
                      </TableCell>
                      <TableCell className="text-sm">{venda.peca.localizacao}</TableCell>
                      <TableCell>
                        {venda.statusEnvio === "ENVIADO" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Enviado
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAtrasado ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}`}>
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {venda.statusEnvio === "ENVIADO" ? (
                          venda.codigoRastreio ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title={venda.codigoRastreio}>
                              <Check className="h-3 w-3 mr-1" />
                              Sim
                            </span>
                          ) : venda.tipoEntrega ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700" title={venda.tipoEntrega === "RETIRADA_PESSOALMENTE" ? "Retirou pessoalmente" : "Entrega no RJ"}>
                              {venda.tipoEntrega === "RETIRADA_PESSOALMENTE" ? "Retirada" : "RJ"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate" title={venda.observacaoLogistica || ""}>
                          {venda.observacaoLogistica || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {venda.statusEnvio === "PENDENTE" ? (
                          <Button
                            size="sm"
                            onClick={() => abrirModalEnvio(venda.id, venda.peca.sku)}
                            disabled={marcarEnviadoMutation.isPending}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Enviar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDesfazerEnvio(venda.id)}
                            disabled={desfazerEnvioMutation.isPending}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Desfazer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Paginacao */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Pagina {data.page} de {data.pages} ({data.total} itens)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                >
                  Proxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de visualizacao da imagem */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedImage && (
            <div className="flex flex-col items-center">
              <img
                src={selectedImage.url}
                alt={selectedImage.sku}
                className="max-h-[80vh] w-auto object-contain rounded"
              />
              <p className="mt-2 text-sm text-muted-foreground font-mono">
                {selectedImage.sku}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de envio com código de rastreio */}
      <Dialog open={!!envioModal} onOpenChange={(open) => !open && fecharModalEnvio()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Peca: <span className="font-mono font-medium">{envioModal?.sku}</span>
            </p>

            <div className="space-y-2">
              <Label htmlFor="codigoRastreio">Codigo de Rastreio</Label>
              <Input
                id="codigoRastreio"
                placeholder="Ex: BR123456789BR"
                value={codigoRastreio}
                onChange={(e) => setCodigoRastreio(e.target.value)}
                disabled={!!tipoEntrega}
              />
              {tipoEntrega && (
                <p className="text-xs text-muted-foreground">
                  Codigo desabilitado pois uma opcao de entrega foi selecionada
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">
                Ou selecione se nao houver rastreio:
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="retirada"
                    checked={tipoEntrega === "RETIRADA_PESSOALMENTE"}
                    onCheckedChange={(checked) => {
                      setTipoEntrega(checked ? "RETIRADA_PESSOALMENTE" : null);
                      if (checked) setCodigoRastreio("");
                    }}
                  />
                  <Label htmlFor="retirada" className="cursor-pointer">
                    Retirou pessoalmente
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="entregaRJ"
                    checked={tipoEntrega === "ENTREGA_RJ"}
                    onCheckedChange={(checked) => {
                      setTipoEntrega(checked ? "ENTREGA_RJ" : null);
                      if (checked) setCodigoRastreio("");
                    }}
                  />
                  <Label htmlFor="entregaRJ" className="cursor-pointer">
                    Entrega no RJ
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={fecharModalEnvio}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarEnvio}
              disabled={marcarEnviadoMutation.isPending}
            >
              <Truck className="h-4 w-4 mr-1" />
              {marcarEnviadoMutation.isPending ? "Enviando..." : "Confirmar Envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
