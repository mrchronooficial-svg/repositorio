"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
type Decimal = { toNumber(): number; toString(): string } | number | string;

interface Foto {
  url: string;
}

interface Peca {
  sku: string;
  marca: string;
  modelo: string;
  origemTipo?: string;
  valorCompra?: Decimal | null;
  fotos: Foto[];
}

interface Cliente {
  nome: string;
}

interface Venda {
  id: string;
  dataVenda: Date | string;
  valorFinal: Decimal | null;
  valorRepasseDevido?: Decimal | null;
  statusPagamento: string;
  statusRepasse: string | null;
  statusEnvio: string;
  peca: Peca;
  cliente: Cliente;
}

interface VendasTableProps {
  vendas: Venda[];
  isLoading: boolean;
  podeVerValores: boolean;
  podeExcluir?: boolean;
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function VendasTable({
  vendas,
  isLoading,
  podeVerValores,
  podeExcluir = false,
  onView,
  onEdit,
  onDelete,
}: VendasTableProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; sku: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; sku: string } | null>(null);
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

  if (vendas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma venda encontrada.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Foto</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Peca</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Repasse</TableHead>
            <TableHead>Envio</TableHead>
            {podeVerValores && <TableHead className="text-right">Valor</TableHead>}
            {podeVerValores && <TableHead className="text-right">Lucro Bruto</TableHead>}
            {(onEdit || podeExcluir) && <TableHead className="w-20"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((venda) => (
            <TableRow
              key={venda.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(venda.id)}
            >
              <TableCell className="py-2">
                {venda.peca.fotos?.[0] ? (
                  <img
                    src={venda.peca.fotos[0].url}
                    alt={venda.peca.sku}
                    className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage({ url: venda.peca.fotos[0].url, sku: venda.peca.sku });
                    }}
                    title="Clique para ampliar"
                  />
                ) : (
                  <div className="h-20 w-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    Sem foto
                  </div>
                )}
              </TableCell>
              <TableCell>{formatDate(venda.dataVenda)}</TableCell>
              <TableCell>
                <div className="font-mono text-sm">{venda.peca.sku}</div>
                <div className="text-xs text-muted-foreground">
                  {venda.peca.marca} {venda.peca.modelo}
                </div>
              </TableCell>
              <TableCell>{venda.cliente.nome}</TableCell>
              <TableCell>
                <StatusBadge type="pagamento" status={venda.statusPagamento} size="sm" />
              </TableCell>
              <TableCell>
                {venda.statusRepasse ? (
                  <StatusBadge type="repasse" status={venda.statusRepasse} size="sm" />
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge type="envio" status={venda.statusEnvio} size="sm" />
              </TableCell>
              {podeVerValores && (
                <TableCell className="text-right font-medium">
                  {venda.valorFinal ? formatCurrency(Number(venda.valorFinal)) : "-"}
                </TableCell>
              )}
              {podeVerValores && (
                <TableCell className="text-right font-medium">
                  {(() => {
                    const valorFinal = Number(venda.valorFinal) || 0;
                    if (!valorFinal) return "-";
                    const custo =
                      venda.peca.origemTipo === "CONSIGNACAO"
                        ? Number(venda.valorRepasseDevido) || 0
                        : Number(venda.peca.valorCompra) || 0;
                    const lucro = valorFinal - custo;
                    return (
                      <span className={lucro >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(lucro)}
                      </span>
                    );
                  })()}
                </TableCell>
              )}
              {(onEdit || podeExcluir) && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(venda.id);
                        }}
                        title="Editar venda"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {podeExcluir && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({
                            id: venda.id,
                            sku: venda.peca.sku,
                          });
                        }}
                        title="Cancelar venda"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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

      {/* Dialog de confirmacao de cancelamento */}
      <Dialog open={!!deleteDialog} onOpenChange={() => !isDeleting && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar venda</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar a venda da peca{" "}
              <span className="font-mono font-semibold">{deleteDialog?.sku}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-destructive">
              A peca voltara ao estoque com status Disponivel.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
              disabled={isDeleting}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Cancelando..." : "Cancelar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
