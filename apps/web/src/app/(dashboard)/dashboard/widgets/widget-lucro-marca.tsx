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
  `R$ ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const LINHA_ALTURA = 30;

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

  const alturaGrafico = Math.max(
    data.marcas.length * LINHA_ALTURA + 30,
    120
  );

  return (
    <Card className="h-full flex flex-col">
      <Header
        data={data}
        mesSelecionado={mesSelecionado}
        onMesChange={onMesChange}
      />
      <CardContent className="flex-1 min-h-0 flex flex-col pr-2">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div style={{ height: alturaGrafico }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.marcas}
                layout="vertical"
                margin={{ top: 4, right: 56, bottom: 4, left: 4 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactTick}
                />
                <YAxis
                  type="category"
                  dataKey="marca"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  interval={0}
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
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  label={{
                    position: "right",
                    fontSize: 11,
                    formatter: (v: unknown) => formatCompactTick(Number(v) || 0),
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
