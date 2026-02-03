"use client";

import { useState } from "react";
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
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Decimal } from "@prisma/client/runtime/library";

interface Foto {
  url: string;
}

interface Peca {
  sku: string;
  marca: string;
  modelo: string;
  fotos: Foto[];
}

interface Cliente {
  nome: string;
}

interface Venda {
  id: string;
  dataVenda: Date | string;
  valorFinal: Decimal | null;
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
  onView: (id: string) => void;
}

export function VendasTable({
  vendas,
  isLoading,
  podeVerValores,
  onView,
}: VendasTableProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; sku: string } | null>(null);

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
    </>
  );
}
