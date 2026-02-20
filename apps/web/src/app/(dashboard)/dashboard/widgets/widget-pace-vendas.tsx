"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PaceVendasData {
  mes: string;
  ano: number;
  dados: Array<{ dia: number; acumulado: number }>;
}

interface WidgetPaceVendasProps {
  data?: PaceVendasData[];
  isLoading: boolean;
}

const CORES = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
];

export function WidgetPaceVendas({ data, isLoading }: WidgetPaceVendasProps) {
  if (isLoading || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pace de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  // Filtrar meses que tenham pelo menos 1 venda
  const mesesComVendas = data.filter(
    (m) => m.dados.some((d) => d.acumulado > 0)
  );

  if (mesesComVendas.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pace de Vendas</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm">Sem dados de vendas</p>
        </CardContent>
      </Card>
    );
  }

  // Construir dados para o Recharts: array de { dia, "Jun/25": N, "Jul/25": N, ... }
  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  const chartData = dias.map((dia) => {
    const ponto: Record<string, number> = { dia };
    for (const m of mesesComVendas) {
      const key = `${m.mes}/${String(m.ano).slice(2)}`;
      const d = m.dados.find((dd) => dd.dia === dia);
      if (d) ponto[key] = d.acumulado;
    }
    return ponto;
  });

  // Labels dos meses
  const labels = mesesComVendas.map(
    (m) => `${m.mes}/${String(m.ano).slice(2)}`
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Pace de Vendas (# de pecas)
        </CardTitle>
      </CardHeader>
      <CardContent className="pr-2">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
              labelFormatter={(v) => `Dia ${v}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              iconType="plainline"
            />
            {labels.map((label, idx) => (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={CORES[idx % CORES.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
