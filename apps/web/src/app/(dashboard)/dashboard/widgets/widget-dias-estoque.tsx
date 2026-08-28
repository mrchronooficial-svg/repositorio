"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

// null = serie inteira
const PERIODOS: Array<{ label: string; dias: number | null }> = [
  { label: "30d", dias: 30 },
  { label: "90d", dias: 90 },
  { label: "180d", dias: 180 },
  { label: "Tudo", dias: null },
];

// Crescimento assumido do CMV, em %. Aceita "15", "15,5" e negativo (queda).
// Abaixo de -100% o fator zeraria/inverteria o denominador, entao e rejeitado.
function parseCrescimento(texto: string): number | null {
  const limpo = texto.trim().replace("%", "").replace(",", ".");
  if (!limpo || limpo === "-") return null;
  const n = Number(limpo);
  if (!Number.isFinite(n) || n <= -100 || n > 1000) return null;
  return n;
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
  // null = serie inteira (padrao)
  const [periodoDias, setPeriodoDias] = useState<number | null>(null);
  // Crescimento assumido do CMV; vazio = sem ajuste
  const [crescimentoTexto, setCrescimentoTexto] = useState("");

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

  // Crescimento assumido: multiplica o CMV (denominador) por (1 + g), o que
  // divide os dias de estoque pelo mesmo fator.
  const crescimento = parseCrescimento(crescimentoTexto);
  const fator = crescimento !== null ? 1 + crescimento / 100 : 1;
  const ajustado = fator !== 1;

  // Recalcula do valor bruto (e nao dividindo o numero ja arredondado), para o
  // ajuste nao acumular erro de arredondamento.
  const serieVisivel = ajustado
    ? recorte.map((p) => {
        const cmvAjustado = p.cmv30 * fator;
        return {
          ...p,
          cmv30: Math.round(cmvAjustado * 100) / 100,
          diasEstoque:
            cmvAjustado > 0
              ? Math.round((p.valorEstoque / cmvAjustado) * 30 * 10) / 10
              : null,
        };
      })
    : recorte;

  const diasAtual =
    atual && atual.cmv30 * fator > 0
      ? Math.round((atual.valorEstoque / (atual.cmv30 * fator)) * 30 * 10) / 10
      : null;

  const crescimentoInvalido =
    crescimentoTexto.trim() !== "" && crescimento === null;

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
            {ajustado && (
              <p className="text-[10px] text-muted-foreground">
                com {crescimento! > 0 ? "+" : ""}
                {crescimento!.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
                % de crescimento
              </p>
            )}
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

          <div className="ml-auto flex items-center gap-1">
            <label
              htmlFor="crescimento-cmv"
              className="text-xs text-muted-foreground"
              title="Crescimento assumido do CMV: multiplica o denominador e reduz os dias de estoque"
            >
              Crescimento
            </label>
            <div className="relative">
              <input
                id="crescimento-cmv"
                value={crescimentoTexto}
                onChange={(e) => setCrescimentoTexto(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className={cn(
                  "h-6 w-14 rounded border bg-background pl-1.5 pr-4 text-xs tabular-nums",
                  "focus:outline-none focus:ring-1 focus:ring-ring",
                  crescimentoInvalido
                    ? "border-destructive"
                    : "border-input"
                )}
              />
              <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={serieVisivel}
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
          {ajustado && (
            <>
              {" "}
              CMV multiplicado por{" "}
              {fator.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              .
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
