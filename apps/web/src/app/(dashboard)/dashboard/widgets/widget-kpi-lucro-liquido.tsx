"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KpiLucroLiquidoProps {
  lucroLiquidoMes: number;
  lucroLiquidoPorPeca: number;
}

export function WidgetKpiLucroLiquido({
  lucroLiquidoMes,
  lucroLiquidoPorPeca,
}: KpiLucroLiquidoProps) {
  const positivo = lucroLiquidoMes >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Lucro Líquido por Peça
        </CardTitle>
        {positivo ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", !positivo && "text-red-600")}>
          {formatCurrency(lucroLiquidoPorPeca)}
        </div>
        <p className="text-xs text-muted-foreground">
          Total no mês: {formatCurrency(lucroLiquidoMes)}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Deduz todas as despesas (DRE)
        </p>
      </CardContent>
    </Card>
  );
}
