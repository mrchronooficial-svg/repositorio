"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface KpiLucroBrutoProps {
  lucroBrutoMes: number;
  lucroBrutoPorPeca: number;
}

export function WidgetKpiLucroBruto({
  lucroBrutoMes,
  lucroBrutoPorPeca,
}: KpiLucroBrutoProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Lucro Bruto do Mês
        </CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(lucroBrutoMes)}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(lucroBrutoPorPeca)} por peça
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Já deduz impostos, MDR e manutenção
        </p>
      </CardContent>
    </Card>
  );
}
