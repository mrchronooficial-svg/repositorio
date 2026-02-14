"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Banknote, ArrowRight } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface RecebiveisItem {
  id: string;
  sku: string;
  cliente: string;
  dataVenda: string | Date;
  saldoDevedor: number;
}

interface ModalRecebiveisProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: RecebiveisItem[];
}

export function ModalRecebiveis({
  open,
  onOpenChange,
  data,
}: ModalRecebiveisProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-amber-600" />
            Valores a Receber
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {!data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum valor pendente de recebimento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Peca (SKU)</TableHead>
                  <TableHead>Data da Compra</TableHead>
                  <TableHead className="text-right">Valor Devido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/vendas/${item.id}` as Route);
                    }}
                  >
                    <TableCell className="font-medium">
                      {item.cliente}
                    </TableCell>
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell>{formatDate(item.dataVenda)}</TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      {formatCurrency(item.saldoDevedor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {data && data.length > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {data.length} venda(s) com pagamento pendente
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/vendas?statusPagamento=NAO_PAGO");
                }}
              >
                Ver todas as vendas
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
