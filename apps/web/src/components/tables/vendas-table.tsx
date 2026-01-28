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
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Decimal } from "@prisma/client/runtime/library";

interface Peca {
  sku: string;
  marca: string;
  modelo: string;
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
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Peca</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Pagamento</TableHead>
          <TableHead>Repasse</TableHead>
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
            {podeVerValores && (
              <TableCell className="text-right font-medium">
                {venda.valorFinal ? formatCurrency(Number(venda.valorFinal)) : "-"}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
