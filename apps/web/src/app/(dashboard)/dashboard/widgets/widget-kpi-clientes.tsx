"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiClientesProps {
  totalVendas: number;
  isEditMode: boolean;
}

export function WidgetKpiClientes({
  totalVendas,
  isEditMode,
}: KpiClientesProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => !isEditMode && router.push("/clientes")}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Clientes
        </CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalVendas}</div>
        <p className="text-xs text-muted-foreground">vendas totais</p>
      </CardContent>
    </Card>
  );
}
