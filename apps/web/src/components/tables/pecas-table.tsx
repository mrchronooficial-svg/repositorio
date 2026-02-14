"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/formatters";
import {
  ColumnFilterHeader,
  TextColumnFilter,
  SelectColumnFilter,
  RangeColumnFilter,
  SortColumnFilter,
} from "./column-filter-header";

type Decimal = { toNumber(): number; toString(): string } | number | string;

interface Foto {
  url: string;
}

interface Fornecedor {
  nome: string;
}

interface Venda {
  valorFinal: Decimal;
}

interface Peca {
  id: string;
  sku: string;
  marca: string;
  modelo: string;
  status: string;
  localizacao: string;
  valorCompra: Decimal | null;
  valorEstimadoVenda: Decimal | null;
  valorRepasse?: Decimal | null;
  percentualRepasse?: Decimal | null;
  valorPagoFornecedor?: Decimal | null;
  statusPagamentoFornecedor?: string | null;
  origemTipo?: string;
  exibirNoCatalogo?: boolean;
  fotos: Foto[];
  fornecedor: Fornecedor;
  venda?: Venda | null;
}

interface PecaStatusInfo {
  id: string;
  sku: string;
  status: string;
  localizacao: string;
}

export interface PecaPgtoInfo {
  id: string;
  sku: string;
  valorCompra: number;
  valorPago: number;
  origemTipo: string;
  status: string;
}

export interface ColumnFilters {
  sku?: string;
  marca?: string;
  fornecedor?: string;
  origemTipo?: string;
  status?: string;
  localizacao?: string;
  statusPagamentoFornecedor?: string;
  valorMin?: number;
  valorMax?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface ColumnFilterCallbacks {
  onSkuChange: (v: string) => void;
  onMarcaChange: (v: string) => void;
  onFornecedorChange: (v: string) => void;
  onOrigemTipoChange: (v: string | undefined) => void;
  onStatusChange: (v: string | undefined) => void;
  onLocalizacaoChange: (v: string | undefined) => void;
  onStatusPgtoChange: (v: string | undefined) => void;
  onValorRangeChange: (min: number | undefined, max: number | undefined) => void;
  onSortChange: (sortBy: string, sortDir: string) => void;
}

interface PecasTableProps {
  pecas: Peca[];
  isLoading: boolean;
  podeVerValores: boolean;
  podeExcluir?: boolean;
  onView: (id: string) => void;
  onStatusClick?: (peca: PecaStatusInfo) => void;
  onDelete?: (id: string) => Promise<void>;
  onToggleCatalogo?: (id: string, exibir: boolean) => void;
  onPgtoClick?: (peca: PecaPgtoInfo) => void;
  // Optional column filters
  filters?: ColumnFilters;
  filterCallbacks?: ColumnFilterCallbacks;
  localizacoes?: string[];
}

export function PecasTable({
  pecas,
  isLoading,
  podeVerValores,
  podeExcluir = false,
  onView,
  onStatusClick,
  onDelete,
  onToggleCatalogo,
  onPgtoClick,
  filters,
  filterCallbacks,
  localizacoes,
}: PecasTableProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; sku: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; sku: string; marca: string; modelo: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasFilters = !!filters && !!filterCallbacks;

  const handleDelete = async () => {
    if (!deleteDialog || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteDialog.id);
      setDeleteDialog(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (pecas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma peca encontrada.
      </div>
    );
  }

  // Status options
  const statusOptions = [
    { value: "DISPONIVEL", label: "Disponivel" },
    { value: "EM_TRANSITO", label: "Em Transito" },
    { value: "REVISAO", label: "Em Revisao" },
    { value: "VENDIDA", label: "Vendida" },
    { value: "DEFEITO", label: "Defeito" },
    { value: "PERDA", label: "Perda" },
  ];

  const origemOptions = [
    { value: "COMPRA", label: "Compra" },
    { value: "CONSIGNACAO", label: "Consignacao" },
  ];

  const pgtoOptions = [
    { value: "PAGO", label: "Pago" },
    { value: "PARCIAL", label: "Parcial" },
    { value: "NAO_PAGO", label: "Nao Pago" },
  ];

  const locOptions = (localizacoes || []).map((loc) => ({
    value: loc,
    label: loc,
  }));

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          {onToggleCatalogo && <TableHead className="w-10 px-2" title="Exibir no catalogo">Cat.</TableHead>}
          <TableHead className="w-24">Foto</TableHead>

          {/* SKU */}
          <TableHead>
            {hasFilters ? (
              <ColumnFilterHeader label="SKU" active={!!filters.sku}>
                <TextColumnFilter
                  label="SKU"
                  value={filters.sku || ""}
                  onChange={filterCallbacks.onSkuChange}
                  placeholder="Ex: MRC-0001"
                />
              </ColumnFilterHeader>
            ) : "SKU"}
          </TableHead>

          {/* Marca / Modelo */}
          <TableHead>
            {hasFilters ? (
              <ColumnFilterHeader label="Marca / Modelo" active={!!filters.marca}>
                <TextColumnFilter
                  label="Marca / Modelo"
                  value={filters.marca || ""}
                  onChange={filterCallbacks.onMarcaChange}
                  placeholder="Ex: Rolex, Submariner..."
                />
              </ColumnFilterHeader>
            ) : "Marca / Modelo"}
          </TableHead>

          {/* Fornecedor */}
          <TableHead>
            {hasFilters ? (
              <ColumnFilterHeader label="Fornecedor" active={!!filters.fornecedor}>
                <TextColumnFilter
                  label="Fornecedor"
                  value={filters.fornecedor || ""}
                  onChange={filterCallbacks.onFornecedorChange}
                  placeholder="Nome do fornecedor..."
                />
              </ColumnFilterHeader>
            ) : "Fornecedor"}
          </TableHead>

          {/* Origem */}
          <TableHead>
            {hasFilters ? (
              <ColumnFilterHeader label="Origem" active={!!filters.origemTipo}>
                <SelectColumnFilter
                  label="Origem"
                  value={filters.origemTipo}
                  onChange={filterCallbacks.onOrigemTipoChange}
                  options={origemOptions}
                />
              </ColumnFilterHeader>
            ) : "Origem"}
          </TableHead>

          {/* Status */}
          <TableHead>
            {hasFilters ? (
              <ColumnFilterHeader label="Status" active={!!filters.status}>
                <SelectColumnFilter
                  label="Status"
                  value={filters.status}
                  onChange={filterCallbacks.onStatusChange}
                  options={statusOptions}
                />
              </ColumnFilterHeader>
            ) : "Status"}
          </TableHead>

          {/* Localizacao */}
          <TableHead>
            {hasFilters ? (
              <ColumnFilterHeader label="Localizacao" active={!!filters.localizacao}>
                <SelectColumnFilter
                  label="Localizacao"
                  value={filters.localizacao}
                  onChange={filterCallbacks.onLocalizacaoChange}
                  options={locOptions}
                />
              </ColumnFilterHeader>
            ) : "Localizacao"}
          </TableHead>

          {/* Pgto Fornecedor */}
          {podeVerValores && (
            <TableHead>
              {hasFilters ? (
                <ColumnFilterHeader label="Pgto. Fornecedor" active={!!filters.statusPagamentoFornecedor}>
                  <SelectColumnFilter
                    label="Pgto. Fornecedor"
                    value={filters.statusPagamentoFornecedor}
                    onChange={filterCallbacks.onStatusPgtoChange}
                    options={pgtoOptions}
                  />
                </ColumnFilterHeader>
              ) : "Pgto. Fornecedor"}
            </TableHead>
          )}

          {/* Valor */}
          {podeVerValores && (
            <TableHead className="text-right">
              {hasFilters ? (
                <ColumnFilterHeader label="Valor" active={filters.valorMin !== undefined || filters.valorMax !== undefined} align="right">
                  <RangeColumnFilter
                    label="Valor Estimado (R$)"
                    min={filters.valorMin}
                    max={filters.valorMax}
                    onChange={filterCallbacks.onValorRangeChange}
                  />
                </ColumnFilterHeader>
              ) : "Valor"}
            </TableHead>
          )}

          {/* Lucro Bruto */}
          {podeVerValores && (
            <TableHead className="text-right">
              {hasFilters ? (
                <ColumnFilterHeader
                  label="Lucro Bruto"
                  active={filters.sortBy === "lucroBruto"}
                  align="right"
                >
                  <SortColumnFilter
                    label="Ordenar Lucro Bruto"
                    sortBy={filters.sortBy || "createdAt"}
                    sortDir={filters.sortDir || "desc"}
                    targetSortBy="lucroBruto"
                    onChange={filterCallbacks.onSortChange}
                  />
                </ColumnFilterHeader>
              ) : "Lucro Bruto"}
            </TableHead>
          )}

          {podeExcluir && <TableHead className="w-12"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pecas.map((peca) => (
          <TableRow
            key={peca.id}
            className={`cursor-pointer hover:bg-muted/50 ${peca.status === "VENDIDA" ? "bg-green-100" : ""}`}
            onClick={() => onView(peca.id)}
          >
            {onToggleCatalogo && (
              <TableCell className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                {!["VENDIDA", "DEFEITO", "PERDA"].includes(peca.status) ? (
                  <Checkbox
                    checked={peca.exibirNoCatalogo !== false}
                    onCheckedChange={(checked) => {
                      onToggleCatalogo(peca.id, !!checked);
                    }}
                    className="h-4 w-4"
                    title={peca.exibirNoCatalogo !== false ? "Visivel no catalogo" : "Oculto do catalogo"}
                  />
                ) : null}
              </TableCell>
            )}
            <TableCell className="py-2">
              {peca.fotos[0] ? (
                <img
                  src={peca.fotos[0].url}
                  alt={peca.sku}
                  className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage({ url: peca.fotos[0].url, sku: peca.sku });
                  }}
                  title="Clique para ampliar"
                />
              ) : (
                <div className="h-20 w-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                  Sem foto
                </div>
              )}
            </TableCell>
            <TableCell className="font-mono font-medium">{peca.sku}</TableCell>
            <TableCell>
              <div className="font-medium">{peca.marca}</div>
              <div className="text-sm text-muted-foreground">{peca.modelo}</div>
            </TableCell>
            <TableCell className="text-sm">{peca.fornecedor.nome}</TableCell>
            <TableCell>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                peca.origemTipo === "CONSIGNACAO"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                {peca.origemTipo === "CONSIGNACAO" ? "Consignacao" : "Compra"}
              </span>
            </TableCell>
            <TableCell>
              <div
                className={onStatusClick ? "cursor-pointer hover:opacity-80 inline-block" : "inline-block"}
                onClick={(e) => {
                  if (onStatusClick) {
                    e.stopPropagation();
                    onStatusClick({
                      id: peca.id,
                      sku: peca.sku,
                      status: peca.status,
                      localizacao: peca.localizacao,
                    });
                  }
                }}
                title={onStatusClick ? "Clique para alterar status" : undefined}
              >
                <StatusBadge type="peca" status={peca.status} size="sm" />
              </div>
            </TableCell>
            <TableCell className="text-sm">{peca.localizacao}</TableCell>
            {podeVerValores && (
              <TableCell>
                <div
                  className={onPgtoClick ? "cursor-pointer hover:opacity-80 inline-block" : "inline-block"}
                  onClick={(e) => {
                    if (onPgtoClick) {
                      e.stopPropagation();
                      onPgtoClick({
                        id: peca.id,
                        sku: peca.sku,
                        valorCompra: Number(peca.valorCompra) || 0,
                        valorPago: Number(peca.valorPagoFornecedor) || 0,
                        origemTipo: peca.origemTipo || "COMPRA",
                        status: peca.status,
                      });
                    }
                  }}
                  title={onPgtoClick ? "Clique para registrar pagamento" : undefined}
                >
                  {peca.origemTipo === "CONSIGNACAO" ? (
                    peca.status === "VENDIDA" ? (
                      <StatusBadge
                        type="repasse"
                        status={
                          peca.statusPagamentoFornecedor === "PAGO" ? "FEITO" :
                          peca.statusPagamentoFornecedor === "PARCIAL" ? "PARCIAL" : "PENDENTE"
                        }
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )
                  ) : (
                    <StatusBadge
                      type="pagamento"
                      status={peca.statusPagamentoFornecedor || "NAO_PAGO"}
                      size="sm"
                    />
                  )}
                </div>
              </TableCell>
            )}
            {podeVerValores && (
              <TableCell className="text-right font-medium">
                {peca.valorEstimadoVenda
                  ? formatCurrency(Number(peca.valorEstimadoVenda))
                  : "-"}
              </TableCell>
            )}
            {podeVerValores && (
              <TableCell className="text-right font-medium">
                {(() => {
                  const valorVenda = peca.venda
                    ? Number(peca.venda.valorFinal) || 0
                    : Number(peca.valorEstimadoVenda) || 0;
                  if (!valorVenda) return "-";

                  let custo: number;
                  if (peca.origemTipo === "CONSIGNACAO") {
                    if (peca.valorRepasse) {
                      custo = Number(peca.valorRepasse);
                    } else if (peca.percentualRepasse) {
                      custo = valorVenda * (Number(peca.percentualRepasse) / 100);
                    } else {
                      custo = 0;
                    }
                  } else {
                    custo = Number(peca.valorCompra) || 0;
                  }

                  const lucro = valorVenda - custo;
                  return (
                    <span className={lucro >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(lucro)}
                    </span>
                  );
                })()}
              </TableCell>
            )}
            {podeExcluir && (
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialog({
                      id: peca.id,
                      sku: peca.sku,
                      marca: peca.marca,
                      modelo: peca.modelo,
                    });
                  }}
                  title="Excluir peca"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>

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

    {/* Dialog de confirmacao de exclusao */}
    <Dialog open={!!deleteDialog} onOpenChange={() => !isDeleting && setDeleteDialog(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar exclusao</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a peca{" "}
            <span className="font-mono font-semibold">{deleteDialog?.sku}</span>
            {" "}({deleteDialog?.marca} {deleteDialog?.modelo})?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-destructive">
            Esta acao nao pode ser desfeita. A peca sera permanentemente removida do sistema.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialog(null)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
