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
  podeExcluir?: boolean;
  onView: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function ClientesTable({
  clientes,
  isLoading,
  podeVerValores,
  podeExcluir = false,
  onView,
  onDelete,
}: ClientesTableProps) {
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

  if (clientes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum cliente encontrado.
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
          <TableHead className="text-right">Compras</TableHead>
          {podeVerValores && (
            <TableHead className="text-right">Faturamento</TableHead>
          )}
          {podeExcluir && <TableHead className="w-12"></TableHead>}
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
            {podeExcluir && (
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialog({
                      id: cliente.id,
                      nome: cliente.nome,
                    });
                  }}
                  title="Arquivar cliente"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {/* Dialog de confirmacao de arquivamento */}
    <Dialog open={!!deleteDialog} onOpenChange={() => !isDeleting && setDeleteDialog(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arquivar cliente</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja arquivar o cliente{" "}
            <span className="font-semibold">{deleteDialog?.nome}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-destructive">
            O cliente sera arquivado e nao aparecera mais nas listagens.
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
            {isDeleting ? "Arquivando..." : "Arquivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
