"use client";

import { BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface KpiEstoqueFaturamentoProps {
  valorFaturamento: number;
  valorCusto: number;
  totalPecas: number;
}

export function WidgetKpiEstoqueFaturamento({
  valorFaturamento,
  valorCusto,
  totalPecas,
}: KpiEstoqueFaturamentoProps) {
  const markup = valorCusto > 0
    ? ((valorFaturamento - valorCusto) / valorCusto * 100).toFixed(0)
    : "—";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Estoque (Faturamento)
        </CardTitle>
        <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(valorFaturamento)}
        </div>
        <p className="text-xs text-muted-foreground">
          {totalPecas} pecas &middot; markup {markup}%
        </p>
      </CardContent>
    </Card>
  );
}
