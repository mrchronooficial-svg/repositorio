"use client";

import { Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface KpiReceberProps {
  recebiveis: number;
  repassesPendentes: number;
  isEditMode: boolean;
  onShowModal: () => void;
}

export function WidgetKpiReceber({
  recebiveis,
  repassesPendentes,
  isEditMode,
  onShowModal,
}: KpiReceberProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => !isEditMode && onShowModal()}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          A Receber
        </CardTitle>
        <Banknote className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-amber-600">
          {formatCurrency(recebiveis)}
        </div>
        <p className="text-xs text-muted-foreground">
          Repasses pendentes: {formatCurrency(repassesPendentes)}
        </p>
      </CardContent>
    </Card>
  );
}
