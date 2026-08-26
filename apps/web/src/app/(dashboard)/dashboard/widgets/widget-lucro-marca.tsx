"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MarcaLucro {
  marca: string;
  quantidade: number;
  lucroBrutoTotal: number;
  lucroBrutoPorPeca: number;
}

interface LucroPorMarcaData {
  ano: number;
  mes: number;
  label: string;
  mesesDisponiveis: Array<{ ano: number; mes: number; label: string }>;
  marcas: MarcaLucro[];
  totalPecas: number;
  lucroBrutoTotal: number;
  lucroBrutoPorPecaGeral: number;
}

interface WidgetLucroMarcaProps {
  data?: LucroPorMarcaData | null;
  isLoading: boolean;
  mesSelecionado: string; // "ano-mes" ou "" para o mes corrente
  onMesChange: (value: string) => void;
}

const CORES = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#ef4444", // red
];

// Sempre com uma casa decimal (ex: 3,9k / 911,7)
const formatUmaCasa = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}M`;
  if (abs >= 1_000)
    return `${(v / 1_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}k`;
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatBRL = (v: number): string =>
  `R$ ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Largura minima por marca; abaixo disso o grafico rola na horizontal
const COLUNA_LARGURA = 68;

function Header({
  data,
  mesSelecionado,
  onMesChange,
}: {
  data?: LucroPorMarcaData | null;
  mesSelecionado: string;
  onMesChange: (value: string) => void;
}) {
  const valorSelect =
    mesSelecionado || (data ? `${data.ano}-${data.mes}` : "");

  return (
    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 flex-none">
      <CardTitle className="text-base">
        Lucro Bruto por Peca Vendida (por marca)
      </CardTitle>
      {data && data.mesesDisponiveis.length > 0 && (
        <Select value={valorSelect} onValueChange={onMesChange}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Selecione o mes" />
          </SelectTrigger>
          <SelectContent>
            {data.mesesDisponiveis.map((m) => (
              <SelectItem
                key={`${m.ano}-${m.mes}`}
                value={`${m.ano}-${m.mes}`}
                className="text-xs"
              >
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </CardHeader>
  );
}

export function WidgetLucroMarca({
  data,
  isLoading,
  mesSelecionado,
  onMesChange,
}: WidgetLucroMarcaProps) {
  if (isLoading || !data) {
    return (
      <Card className="h-full flex flex-col">
        <Header
          data={data}
          mesSelecionado={mesSelecionado}
          onMesChange={onMesChange}
        />
        <CardContent className="flex-1 min-h-0">
          <Skeleton className="h-full min-h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (data.marcas.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <Header
          data={data}
          mesSelecionado={mesSelecionado}
          onMesChange={onMesChange}
        />
        <CardContent className="flex-1 min-h-0 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma peca vendida em {data.label}
          </p>
        </CardContent>
      </Card>
    );
  }

  const larguraGrafico = data.marcas.length * COLUNA_LARGURA;

  return (
    <Card className="h-full flex flex-col">
      <Header
        data={data}
        mesSelecionado={mesSelecionado}
        onMesChange={onMesChange}
      />
      <CardContent className="flex-1 min-h-0 flex flex-col pr-2">
        <div className="flex-1 min-h-0 overflow-x-auto">
          <div className="h-full" style={{ minWidth: larguraGrafico }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.marcas}
                margin={{ top: 18, right: 8, bottom: 4, left: 0 }}
              >
                <XAxis
                  dataKey="marca"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={formatUmaCasa}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                  formatter={(value, _name, item) => {
                    const p = item?.payload as MarcaLucro | undefined;
                    return [
                      `${formatBRL(Number(value) || 0)} / peca` +
                        (p
                          ? ` — ${p.quantidade} ${
                              p.quantidade === 1 ? "peca" : "pecas"
                            } (total ${formatBRL(p.lucroBrutoTotal)})`
                          : ""),
                      "Lucro bruto",
                    ];
                  }}
                />
                <Bar
                  dataKey="lucroBrutoPorPeca"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                  label={{
                    position: "top",
                    fontSize: 10,
                    formatter: (v: unknown) => formatUmaCasa(Number(v) || 0),
                  }}
                >
                  {data.marcas.map((m, idx) => (
                    <Cell key={m.marca} fill={CORES[idx % CORES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground flex-none">
          {data.totalPecas} {data.totalPecas === 1 ? "peca vendida" : "pecas vendidas"}{" "}
          em {data.label} &middot; media geral{" "}
          {formatBRL(data.lucroBrutoPorPecaGeral)}/peca
        </p>
      </CardContent>
    </Card>
  );
}
