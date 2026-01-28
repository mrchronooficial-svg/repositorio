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
import { formatCPFCNPJ } from "@/lib/formatters";
import { TIPO_PESSOA_LABELS } from "@/lib/constants";

interface Fornecedor {
  id: string;
  tipo: string;
  nome: string;
  cpfCnpj: string;
  cidade: string;
  estado: string;
  score: string | null;
  _count: {
    pecas: number;
  };
}

interface FornecedoresTableProps {
  fornecedores: Fornecedor[];
  isLoading: boolean;
  podeVerValores: boolean;
  onView: (id: string) => void;
}

export function FornecedoresTable({
  fornecedores,
  isLoading,
  onView,
}: FornecedoresTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (fornecedores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum fornecedor encontrado.
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
          <TableHead>Score</TableHead>
          <TableHead className="text-right">Pecas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fornecedores.map((fornecedor) => (
          <TableRow
            key={fornecedor.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onView(fornecedor.id)}
          >
            <TableCell className="font-medium">{fornecedor.nome}</TableCell>
            <TableCell>{TIPO_PESSOA_LABELS[fornecedor.tipo]}</TableCell>
            <TableCell>{formatCPFCNPJ(fornecedor.cpfCnpj)}</TableCell>
            <TableCell>
              {fornecedor.cidade}/{fornecedor.estado}
            </TableCell>
            <TableCell>
              {fornecedor.score ? (
                <StatusBadge type="score" status={fornecedor.score} size="sm" />
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              {fornecedor._count.pecas}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
