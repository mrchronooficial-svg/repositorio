"use client";

import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface KpiEstoqueCustoProps {
  valorCusto: number;
  totalPecas: number;
}

export function WidgetKpiEstoqueCusto({
  valorCusto,
  totalPecas,
}: KpiEstoqueCustoProps) {
  const custoMedio = totalPecas > 0 ? valorCusto / totalPecas : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Estoque (Custo)
        </CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(valorCusto)}
        </div>
        <p className="text-xs text-muted-foreground">
          {totalPecas} pecas &middot; {formatCurrency(custoMedio)} medio
        </p>
      </CardContent>
    </Card>
  );
}
