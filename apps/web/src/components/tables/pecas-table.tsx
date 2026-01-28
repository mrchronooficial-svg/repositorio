"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/formatters";
import { Decimal } from "@prisma/client/runtime/library";

interface Foto {
  url: string;
}

interface Fornecedor {
  nome: string;
}

interface Peca {
  id: string;
  sku: string;
  marca: string;
  modelo: string;
  status: string;
  localizacao: string;
  valorEstimadoVenda: Decimal | null;
  fotos: Foto[];
  fornecedor: Fornecedor;
}

interface PecasTableProps {
  pecas: Peca[];
  isLoading: boolean;
  podeVerValores: boolean;
  onView: (id: string) => void;
}

export function PecasTable({
  pecas,
  isLoading,
  podeVerValores,
  onView,
}: PecasTableProps) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Foto</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Marca / Modelo</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Localizacao</TableHead>
          {podeVerValores && <TableHead className="text-right">Valor</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pecas.map((peca) => (
          <TableRow
            key={peca.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onView(peca.id)}
          >
            <TableCell>
              {peca.fotos[0] ? (
                <img
                  src={peca.fotos[0].url}
                  alt={peca.sku}
                  className="h-12 w-12 object-cover rounded"
                />
              ) : (
                <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
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
              <StatusBadge type="peca" status={peca.status} size="sm" />
            </TableCell>
            <TableCell className="text-sm">{peca.localizacao}</TableCell>
            {podeVerValores && (
              <TableCell className="text-right font-medium">
                {peca.valorEstimadoVenda
                  ? formatCurrency(Number(peca.valorEstimadoVenda))
                  : "-"}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
