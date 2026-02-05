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
  podeExcluir?: boolean;
  onView: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function FornecedoresTable({
  fornecedores,
  isLoading,
  podeExcluir = false,
  onView,
  onDelete,
}: FornecedoresTableProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; nome: string } | null>(null);
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
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>CPF/CNPJ</TableHead>
          <TableHead>Cidade/UF</TableHead>
          <TableHead>Score</TableHead>
          <TableHead className="text-right">Pecas</TableHead>
          {podeExcluir && <TableHead className="w-12"></TableHead>}
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
            {podeExcluir && (
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialog({
                      id: fornecedor.id,
                      nome: fornecedor.nome,
                    });
                  }}
                  title="Excluir fornecedor"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {/* Dialog de confirmacao de exclusao */}
    <Dialog open={!!deleteDialog} onOpenChange={() => !isDeleting && setDeleteDialog(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir fornecedor</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o fornecedor{" "}
            <span className="font-semibold">{deleteDialog?.nome}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-destructive">
            O fornecedor sera permanentemente removido do sistema. Esta acao nao pode ser desfeita.
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
