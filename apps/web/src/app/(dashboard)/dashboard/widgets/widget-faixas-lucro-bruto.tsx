"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FaixaLinha {
  label: string;
  disponiveis: number;
  chegando: number;
  total: number;
}

interface FaixasLucroBrutoProps {
  faixas: FaixaLinha[];
  totalDisponiveis: number;
  totalChegando: number;
  totalGeral: number;
}

export function WidgetFaixasLucroBruto({
  faixas,
  totalDisponiveis,
  totalChegando,
  totalGeral,
}: FaixasLucroBrutoProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Estoque por Faixa de Lucro Bruto
        </CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                  Faixa
                </th>
                <th className="text-right py-2 text-xs font-medium text-green-600">
                  Disponiveis
                </th>
                <th className="text-right py-2 text-xs font-medium text-blue-600">
                  Chegando
                </th>
                <th className="text-right py-2 text-xs font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {faixas.map((f) => (
                <tr key={f.label} className="border-b last:border-0">
                  <td className="py-2 text-sm">{f.label}</td>
                  <td className="py-2 text-sm text-right tabular-nums">
                    {f.disponiveis}
                  </td>
                  <td className="py-2 text-sm text-right tabular-nums">
                    {f.chegando}
                  </td>
                  <td className="py-2 text-sm text-right font-medium tabular-nums">
                    {f.total}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td className="py-2 text-sm font-semibold">Total</td>
                <td className="py-2 text-sm text-right font-semibold tabular-nums text-green-600">
                  {totalDisponiveis}
                </td>
                <td className="py-2 text-sm text-right font-semibold tabular-nums text-blue-600">
                  {totalChegando}
                </td>
                <td className="py-2 text-sm text-right font-semibold tabular-nums">
                  {totalGeral}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Peças próprias e consignadas. Lucro bruto estimado abaixo de R$ 2.000
          não é exibido.
        </p>
      </CardContent>
    </Card>
  );
}
