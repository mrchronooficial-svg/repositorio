"use client";

import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiVendasProps {
  vendasMes: number;
  variacao: number;
  isEditMode: boolean;
}

export function WidgetKpiVendas({
  vendasMes,
  variacao,
  isEditMode,
}: KpiVendasProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => !isEditMode && router.push("/vendas")}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Vendas do Mes
        </CardTitle>
        {variacao >= 0 ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{vendasMes}</div>
        <p
          className={cn(
            "text-xs",
            variacao >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {variacao >= 0 ? "+" : ""}
          {variacao}% vs mes anterior
        </p>
      </CardContent>
    </Card>
  );
}
