"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface DividasProps {
  repasses: {
    total: number;
    quantidade: number;
    itens: RepasseItem[];
  };
  pagamentos: {
    total: number;
    quantidade: number;
    itens: PagamentoItem[];
  };
  isEditMode: boolean;
}

export function WidgetDividas({
  repasses,
  pagamentos,
  isEditMode,
}: DividasProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Repasses Pendentes (Consignados) */}
      {repasses.quantidade > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Repasses Pendentes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pecas consignadas vendidas
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(repasses.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {repasses.quantidade} peca(s)
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {repasses.itens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() =>
                    !isEditMode &&
                    router.push(`/vendas/${item.id}` as Route)
                  }
                >
                  <div>
                    <p className="font-mono text-sm">{item.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.fornecedor}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">
                      {formatCurrency(item.pendente)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      de {formatCurrency(item.devido)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagamentos Pendentes (Compras) */}
      {pagamentos.quantidade > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pagamentos Pendentes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pecas compradas nao pagas
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(pagamentos.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {pagamentos.quantidade} peca(s)
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pagamentos.itens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() =>
                    !isEditMode &&
                    router.push(`/estoque/${item.id}` as Route)
                  }
                >
                  <div>
                    <p className="font-mono text-sm">{item.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.fornecedor}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">
                      {formatCurrency(item.pendente)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      de {formatCurrency(item.valorCompra)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
