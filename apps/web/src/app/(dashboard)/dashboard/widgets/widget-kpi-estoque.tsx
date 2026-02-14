"use client";

import { useRouter } from "next/navigation";
import { Package, CheckCircle, Truck, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiEstoqueProps {
  emEstoque: number;
  disponivel: number;
  emTransito: number;
  emRevisao: number;
  isEditMode: boolean;
}

export function WidgetKpiEstoque({
  emEstoque,
  disponivel,
  emTransito,
  emRevisao,
  isEditMode,
}: KpiEstoqueProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => !isEditMode && router.push("/estoque")}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pecas em Estoque
        </CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{emEstoque}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {disponivel} disponivel
          </span>
          <span className="text-xs text-blue-600 flex items-center gap-1">
            <Truck className="h-3 w-3" />
            {emTransito} transito
          </span>
          <span className="text-xs text-orange-600 flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            {emRevisao} revisao
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
