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
import { formatCPFCNPJ, formatCurrency } from "@/lib/formatters";
import { TIPO_PESSOA_LABELS } from "@/lib/constants";

interface ClienteMetricas {
  totalCompras: number;
  faturamento: number | null;
}

interface Cliente {
  id: string;
  tipo: string;
  nome: string;
  cpfCnpj: string;
  cidade: string;
  estado: string;
  _metricas: ClienteMetricas;
}

interface ClientesTableProps {
  clientes: Cliente[];
  isLoading: boolean;
  podeVerValores: boolean;
  onView: (id: string) => void;
}

export function ClientesTable({
  clientes,
  isLoading,
  podeVerValores,
  onView,
}: ClientesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum cliente encontrado.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>CPF/CNPJ</TableHead>
          <TableHead>Cidade/UF</TableHead>
          <TableHead className="text-right">Compras</TableHead>
          {podeVerValores && (
            <TableHead className="text-right">Faturamento</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((cliente) => (
          <TableRow
            key={cliente.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onView(cliente.id)}
          >
            <TableCell className="font-medium">{cliente.nome}</TableCell>
            <TableCell>{TIPO_PESSOA_LABELS[cliente.tipo]}</TableCell>
            <TableCell>{formatCPFCNPJ(cliente.cpfCnpj)}</TableCell>
            <TableCell>
              {cliente.cidade}/{cliente.estado}
            </TableCell>
            <TableCell className="text-right">
              {cliente._metricas.totalCompras}
            </TableCell>
            {podeVerValores && (
              <TableCell className="text-right font-medium">
                {cliente._metricas.faturamento !== null
                  ? formatCurrency(cliente._metricas.faturamento)
                  : "-"}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
