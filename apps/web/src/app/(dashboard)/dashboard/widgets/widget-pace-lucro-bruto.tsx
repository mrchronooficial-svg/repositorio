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

interface PaceLucroBrutoData {
  mes: string;
  ano: number;
  dados: Array<{ dia: number; acumulado: number }>;
}

interface WidgetPaceLucroBrutoProps {
  data?: PaceLucroBrutoData[];
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

const formatCompactTick = (v: number): string => {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000)
    return `${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
};

const formatBRL = (v: number): string =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function WidgetPaceLucroBruto({
  data,
  isLoading,
}: WidgetPaceLucroBrutoProps) {
  if (isLoading || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pace de Lucro Bruto</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  const nomesMeses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const mesesComDados = data
    .filter((m) => m.dados.some((d) => d.acumulado !== 0))
    .sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return nomesMeses.indexOf(a.mes) - nomesMeses.indexOf(b.mes);
    });

  if (mesesComDados.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pace de Lucro Bruto</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm">
            Sem dados de lucro bruto
          </p>
        </CardContent>
      </Card>
    );
  }

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const maxDia = Math.max(...mesesComDados.map((m) => m.dados.length));
  const dias = Array.from({ length: maxDia }, (_, i) => i + 1);
  const chartData = dias.map((dia) => {
    const ponto: Record<string, number | undefined> = { dia };
    for (const m of mesesComDados) {
      const key = `${m.mes}/${String(m.ano).slice(2)}`;
      const mesIdx = nomesMeses.indexOf(m.mes);
      const eMesAtual = m.ano === anoAtual && mesIdx === mesAtual;
      if (eMesAtual && dia > hoje.getDate()) continue;
      const d = m.dados.find((dd) => dd.dia === dia);
      if (d) ponto[key] = d.acumulado;
    }
    return ponto;
  });

  const labels = mesesComDados.map(
    (m) => `${m.mes}/${String(m.ano).slice(2)}`
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <CardTitle className="text-base">
          Pace de Lucro Bruto (R$, sem manutencao)
        </CardTitle>
      </CardHeader>
      <CardContent className="pr-2 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
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
              tickFormatter={formatCompactTick}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
              labelFormatter={(v) => `Dia ${v}`}
              formatter={(value) => [
                formatBRL(Number(value) || 0),
                "",
              ]}
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
                dot={{ r: 3, fill: CORES[idx % CORES.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
