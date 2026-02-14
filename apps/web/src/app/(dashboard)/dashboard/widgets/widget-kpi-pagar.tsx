"use client";

import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface KpiPagarProps {
  totalGeral: number;
  repassesTotal: number;
  repassesQtd: number;
  pagamentosTotal: number;
  pagamentosQtd: number;
  isEditMode: boolean;
  onShowModal: () => void;
}

export function WidgetKpiPagar({
  totalGeral,
  repassesTotal,
  repassesQtd,
  pagamentosTotal,
  pagamentosQtd,
  isEditMode,
  onShowModal,
}: KpiPagarProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => !isEditMode && onShowModal()}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          A Pagar (Fornecedores)
        </CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-red-600">
          {formatCurrency(totalGeral)}
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
          <p>
            Repasses (consignado):{" "}
            <span className="font-medium">
              {formatCurrency(repassesTotal)}
            </span>
            {repassesQtd > 0 && (
              <span className="text-muted-foreground"> ({repassesQtd})</span>
            )}
          </p>
          <p>
            Pagamentos (compra):{" "}
            <span className="font-medium">
              {formatCurrency(pagamentosTotal)}
            </span>
            {pagamentosQtd > 0 && (
              <span className="text-muted-foreground"> ({pagamentosQtd})</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
