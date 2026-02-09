"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Check, X, Search, Clock, DollarSign } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatusBadge } from "@/components/status-badge";
import { trpc } from "@/utils/trpc";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export default function NfePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusNfe, setStatusNfe] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<{ url: string; sku: string } | null>(null);

  const queryOptions = trpc.nfe.list.queryOptions({
    page,
    limit: 20,
    search: search || undefined,
    status: statusNfe !== "all" ? (statusNfe as "DECLARADA" | "NAO_DECLARADA") : undefined,
  });

  const { data, isLoading } = useQuery(queryOptions);

  const metricasOptions = trpc.nfe.getMetricas.queryOptions();
  const { data: metricas } = useQuery(metricasOptions);

  const marcarDeclaradaMutation = useMutation(
    trpc.nfe.marcarDeclarada.mutationOptions({
      onSuccess: () => {
        toast.success("NFe marcada como declarada!");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
        queryClient.invalidateQueries({ queryKey: metricasOptions.queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const desmarcarDeclaradaMutation = useMutation(
    trpc.nfe.desmarcarDeclarada.mutationOptions({
      onSuccess: () => {
        toast.success("NFe desmarcada!");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
        queryClient.invalidateQueries({ queryKey: metricasOptions.queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "NFe" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NFe</h1>
          <p className="text-muted-foreground">
            Controle de declaracao fiscal das vendas
          </p>
        </div>
      </div>

      {/* Cards de metricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metricas?.pendentes ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Vendas nao declaradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declaradas</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metricas?.declaradas ?? "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Vendas com NFe emitida
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metricas?.valorPendente !== undefined
                ? formatCurrency(metricas.valorPendente)
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma dos valores a declarar pendentes
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
              value={statusNfe}
              onValueChange={(value) => {
                setStatusNfe(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="DECLARADA">Declarada</SelectItem>
                <SelectItem value="NAO_DECLARADA">Nao Declarada</SelectItem>
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
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma venda encontrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Foto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Valor a Declarar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell className="py-2">
                      {venda.peca.fotos?.[0] ? (
                        <img
                          src={venda.peca.fotos[0].url}
                          alt={venda.peca.sku}
                          className="h-14 w-14 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() =>
                            setSelectedImage({
                              url: venda.peca.fotos[0].url,
                              sku: venda.peca.sku,
                            })
                          }
                          title="Clique para ampliar"
                        />
                      ) : (
                        <div className="h-14 w-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
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
                    <TableCell className="text-sm">
                      {venda.peca.fornecedor?.nome || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {venda.cliente.nome}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {venda.valorDeclarar
                          ? formatCurrency(Number(venda.valorDeclarar))
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        type="nfe"
                        status={venda.nfeDeclarada ? "DECLARADA" : "NAO_DECLARADA"}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {venda.nfeDeclarada ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            desmarcarDeclaradaMutation.mutate({ vendaId: venda.id })
                          }
                          disabled={desmarcarDeclaradaMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Desmarcar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            marcarDeclaradaMutation.mutate({ vendaId: venda.id })
                          }
                          disabled={marcarDeclaradaMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Declarar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  );
}
