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

interface PecasTableProps {
  pecas: Peca[];
  isLoading: boolean;
  podeVerValores: boolean;
  podeExcluir?: boolean;
  onView: (id: string) => void;
  onStatusClick?: (peca: PecaStatusInfo) => void;
  onDelete?: (id: string) => Promise<void>;
  onToggleCatalogo?: (id: string, exibir: boolean) => void;
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
}: PecasTableProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; sku: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; sku: string; marca: string; modelo: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          {onToggleCatalogo && <TableHead className="w-10 px-2" title="Exibir no catálogo">Cat.</TableHead>}
          <TableHead className="w-24">Foto</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Marca / Modelo</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Localizacao</TableHead>
          {podeVerValores && <TableHead>Pgto. Fornecedor</TableHead>}
          {podeVerValores && <TableHead className="text-right">Valor</TableHead>}
          {podeVerValores && <TableHead className="text-right">Lucro Bruto</TableHead>}
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
                    title={peca.exibirNoCatalogo !== false ? "Visível no catálogo" : "Oculto do catálogo"}
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
                {peca.origemTipo === "CONSIGNACAO" ? (
                  // Consignação: só mostra status de repasse após a venda
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
                  // Compra: mostra status de pagamento sempre
                  <StatusBadge
                    type="pagamento"
                    status={peca.statusPagamentoFornecedor || "NAO_PAGO"}
                    size="sm"
                  />
                )}
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
                  // Usar valor real da venda se vendida, senao estimado
                  const valorVenda = peca.venda
                    ? Number(peca.venda.valorFinal) || 0
                    : Number(peca.valorEstimadoVenda) || 0;
                  if (!valorVenda) return "-";

                  let custo: number;
                  if (peca.origemTipo === "CONSIGNACAO") {
                    if (peca.valorRepasse) {
                      // Repasse fixo
                      custo = Number(peca.valorRepasse);
                    } else if (peca.percentualRepasse) {
                      // Repasse percentual: calcula sobre valor da venda
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
