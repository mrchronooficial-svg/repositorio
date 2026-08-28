"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import {
  Area,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PontoDiasEstoque {
  data: string; // "YYYY-MM-DD"
  diasEstoque: number | null;
  valorEstoque: number;
  qtdEstoque: number;
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

// null = serie inteira
const PERIODOS: Array<{ label: string; dias: number | null }> = [
  { label: "30d", dias: 30 },
  { label: "90d", dias: 90 },
  { label: "180d", dias: 180 },
  { label: "Tudo", dias: null },
];

// Crescimento assumido do CMV, fixo. O denominador (CMV dos ultimos 30 dias)
// e multiplicado por este fator, o que reduz os dias de estoque na mesma
// proporcao — a leitura ja embute a expectativa de crescimento das vendas.
const CRESCIMENTO_CMV_PCT = 20;
const FATOR_CMV = 1 + CRESCIMENTO_CMV_PCT / 100;

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
  // null = serie inteira (padrao)
  const [periodoDias, setPeriodoDias] = useState<number | null>(null);

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

  // Periodos maiores que a serie disponivel nao sao oferecidos — evita botoes
  // que nao mudam nada quando ainda ha poucos dias de historico.
  const periodosDisponiveis = PERIODOS.filter(
    (p, i) => p.dias === null || p.dias < data.serie.length || i === 0
  );
  const recorte =
    periodoDias === null ? data.serie : data.serie.slice(-periodoDias);

  // Recalcula do valor bruto (e nao dividindo o numero ja arredondado), para o
  // ajuste nao acumular erro de arredondamento.
  const serieVisivel = recorte.map((p) => {
    const cmvAjustado = p.cmv30 * FATOR_CMV;
    return {
      ...p,
      cmv30: Math.round(cmvAjustado * 100) / 100,
      diasEstoque:
        cmvAjustado > 0
          ? Math.round((p.valorEstoque / cmvAjustado) * 30 * 10) / 10
          : null,
    };
  });

  const diasAtual =
    atual && atual.cmv30 > 0
      ? Math.round((atual.valorEstoque / (atual.cmv30 * FATOR_CMV)) * 30 * 10) /
        10
      : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-baseline justify-between gap-2 pb-2 flex-none">
        <CardTitle className="text-base">Dias de Estoque</CardTitle>
        {diasAtual != null && (
          <div className="text-right leading-tight">
            <span className="text-2xl font-bold tabular-nums">
              {diasAtual.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="text-sm text-muted-foreground ml-1">dias</span>
            <p className="text-[10px] text-muted-foreground">
              com +{CRESCIMENTO_CMV_PCT}% de crescimento
              {atual && (
                <>
                  {" "}
                  &middot;{" "}
                  <span className="text-red-600">
                    {atual.qtdEstoque} pecas
                  </span>
                </>
              )}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col pr-2">
        <div className="flex items-center gap-1 pb-2 flex-none">
          {periodosDisponiveis.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPeriodoDias(p.dias)}
              className={cn(
                "px-2 py-0.5 rounded text-xs transition-colors",
                periodoDias === p.dias
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={serieVisivel}
              margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
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
                yAxisId="dias"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={34}
                tickFormatter={(v: number) =>
                  Number(v).toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })
                }
              />
              <YAxis
                yAxisId="qtd"
                orientation="right"
                tick={{ fontSize: 11, fill: "#dc2626" }}
                tickLine={false}
                axisLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
                labelFormatter={(v) => rotuloCompleto(String(v))}
                formatter={(value, name, item) => {
                  const p = item?.payload as PontoDiasEstoque | undefined;

                  if (name === "Pecas em estoque") {
                    return [
                      `${Number(value)} ${Number(value) === 1 ? "peca" : "pecas"}`,
                      name,
                    ];
                  }

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
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 2 }}
                iconType="plainline"
              />
              <Area
                yAxisId="dias"
                type="monotone"
                dataKey="diasEstoque"
                name="Dias de estoque"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gradDiasEstoque)"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                yAxisId="qtd"
                type="monotone"
                dataKey="qtdEstoque"
                name="Pecas em estoque"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground flex-none">
          Valor do estoque proprio a custo &divide; CMV dos ultimos 30 dias
          &times; 30. Considera pecas compradas em Disponivel, Em Transito ou
          Revisao. O CMV e multiplicado por{" "}
          {FATOR_CMV.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}{" "}
          (crescimento assumido de {CRESCIMENTO_CMV_PCT}%).
        </p>
      </CardContent>
    </Card>
  );
}
