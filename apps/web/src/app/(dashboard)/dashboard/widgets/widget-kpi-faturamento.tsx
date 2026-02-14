"use client";

import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KpiFaturamentoProps {
  faturamentoMes: number;
  variacaoFaturamento: number;
}

export function WidgetKpiFaturamento({
  faturamentoMes,
  variacaoFaturamento,
}: KpiFaturamentoProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Faturamento do Mes
        </CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(faturamentoMes)}
        </div>
        <p
          className={cn(
            "text-xs",
            variacaoFaturamento >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {variacaoFaturamento >= 0 ? "+" : ""}
          {variacaoFaturamento}% vs mes anterior
        </p>
      </CardContent>
    </Card>
  );
}
