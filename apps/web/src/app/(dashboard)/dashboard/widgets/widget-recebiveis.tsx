"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/formatters";

interface RecebiveisItem {
  id: string;
  sku: string;
  cliente: string;
  valorTotal: number;
  totalPago: number;
  saldoDevedor: number;
  statusPagamento: string;
}

interface RecebiveisProps {
  data: RecebiveisItem[];
  isEditMode: boolean;
}

export function WidgetRecebiveis({ data, isEditMode }: RecebiveisProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recebiveis Pendentes</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            !isEditMode &&
            router.push("/vendas?statusPagamento=NAO_PAGO")
          }
        >
          Ver todas
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium">SKU</th>
                <th className="text-left py-2 text-sm font-medium">
                  Cliente
                </th>
                <th className="text-right py-2 text-sm font-medium">
                  Total
                </th>
                <th className="text-right py-2 text-sm font-medium">Pago</th>
                <th className="text-right py-2 text-sm font-medium">
                  Saldo
                </th>
                <th className="text-center py-2 text-sm font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() =>
                    !isEditMode &&
                    router.push(`/vendas/${item.id}` as Route)
                  }
                >
                  <td className="py-2 font-mono text-sm">{item.sku}</td>
                  <td className="py-2 text-sm">{item.cliente}</td>
                  <td className="py-2 text-sm text-right">
                    {formatCurrency(item.valorTotal)}
                  </td>
                  <td className="py-2 text-sm text-right">
                    {formatCurrency(item.totalPago)}
                  </td>
                  <td className="py-2 text-sm text-right font-medium text-amber-600">
                    {formatCurrency(item.saldoDevedor)}
                  </td>
                  <td className="py-2 text-center">
                    <StatusBadge
                      type="pagamento"
                      status={item.statusPagamento}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
