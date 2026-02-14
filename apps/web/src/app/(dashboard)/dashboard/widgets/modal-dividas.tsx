"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";

interface RepasseItem {
  id: string;
  sku: string;
  fornecedor: string;
  devido: number;
  pendente: number;
}

interface PagamentoItem {
  id: string;
  sku: string;
  fornecedor: string;
  valorCompra: number;
  pendente: number;
}

interface ModalDividasProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: {
    totalGeral: number;
    repasses: { total: number; quantidade: number; itens: RepasseItem[] };
    pagamentos: {
      total: number;
      quantidade: number;
      itens: PagamentoItem[];
    };
  };
}

export function ModalDividas({
  open,
  onOpenChange,
  data,
}: ModalDividasProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-red-600" />
            Valores a Pagar (Fornecedores)
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {data && data.totalGeral > 0 ? (
            <>
              {/* Total Geral */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <span className="font-medium text-red-800">Total a Pagar</span>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(data.totalGeral)}
                </span>
              </div>

              {/* Repasses Pendentes (Consignados) */}
              {data.repasses.quantidade > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">
                      Repasses Pendentes (Consignados)
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {data.repasses.quantidade} peca(s) -{" "}
                      {formatCurrency(data.repasses.total)}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Peca (SKU)</TableHead>
                        <TableHead className="text-right">
                          Valor Devido
                        </TableHead>
                        <TableHead className="text-right">
                          Valor Pendente
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.repasses.itens.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            onOpenChange(false);
                            router.push(`/vendas/${item.id}` as Route);
                          }}
                        >
                          <TableCell className="font-medium">
                            {item.fornecedor}
                          </TableCell>
                          <TableCell className="font-mono">
                            {item.sku}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.devido)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(item.pendente)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagamentos Pendentes (Compras) */}
              {data.pagamentos.quantidade > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">
                      Pagamentos Pendentes (Compras)
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {data.pagamentos.quantidade} peca(s) -{" "}
                      {formatCurrency(data.pagamentos.total)}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Peca (SKU)</TableHead>
                        <TableHead className="text-right">
                          Valor Compra
                        </TableHead>
                        <TableHead className="text-right">
                          Valor Pendente
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.pagamentos.itens.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            onOpenChange(false);
                            router.push(`/estoque/${item.id}` as Route);
                          }}
                        >
                          <TableCell className="font-medium">
                            {item.fornecedor}
                          </TableCell>
                          <TableCell className="font-mono">
                            {item.sku}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.valorCompra)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(item.pendente)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma obrigacao pendente com fornecedores.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
