"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PontoDiasEstoque {
  data: string; // "YYYY-MM-DD"
  diasEstoque: number | null;
  valorEstoque: number;
  cmv30: number;
}

interface DiasEstoqueData {
  serie: PontoDiasEstoque[];
  atual: PontoDiasEstoque | null;
}

interface WidgetDiasEstoqueProps {
  data?: DiasEstoqueData | null;
  isLoading: boolean;
}

// "2026-08-28" -> "28/08" (sem passar por Date, para nao pegar fuso)
function rotuloDia(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function rotuloCompleto(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function WidgetDiasEstoque({ data, isLoading }: WidgetDiasEstoqueProps) {
  if (isLoading || !data) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 flex-none">
          <CardTitle className="text-base">Dias de Estoque</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <Skeleton className="h-full min-h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (data.serie.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 flex-none">
          <CardTitle className="text-base">Dias de Estoque</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Dados insuficientes — sao necessarios 30 dias de vendas
          </p>
        </CardContent>
      </Card>
    );
  }

  const atual = data.atual;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-baseline justify-between gap-2 pb-2 flex-none">
        <CardTitle className="text-base">Dias de Estoque</CardTitle>
        {atual?.diasEstoque != null && (
          <div className="text-right">
            <span className="text-2xl font-bold tabular-nums">
              {atual.diasEstoque.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="text-sm text-muted-foreground ml-1">dias</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col pr-2">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.serie}
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
            >
              <defs>
                <linearGradient id="gradDiasEstoque" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                tickFormatter={rotuloDia}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(v: number) =>
                  Number(v).toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })
                }
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
                labelFormatter={(v) => rotuloCompleto(String(v))}
                formatter={(value, _name, item) => {
                  const p = item?.payload as PontoDiasEstoque | undefined;
                  const dias =
                    value == null
                      ? "sem vendas na janela"
                      : `${Number(value).toLocaleString("pt-BR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })} dias`;
                  return [
                    p
                      ? `${dias} — estoque ${formatCurrency(p.valorEstoque)}, CMV 30d ${formatCurrency(p.cmv30)}`
                      : dias,
                    "Dias de estoque",
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="diasEstoque"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gradDiasEstoque)"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground flex-none">
          Valor do estoque proprio a custo &divide; CMV dos ultimos 30 dias
          &times; 30. Considera pecas compradas em Disponivel, Em Transito ou
          Revisao.
        </p>
      </CardContent>
    </Card>
  );
}
