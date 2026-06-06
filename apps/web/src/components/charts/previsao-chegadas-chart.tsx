"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PrevisaoChegada {
  data: string;
  label: string;
  quantidade: number;
  pecas: { sku: string; marca: string; modelo: string }[];
}

export interface PrevisaoData {
  estoqueAtual: number;
  chegadas: PrevisaoChegada[];
  totalPrevisto: number;
}

type TipoBarra = "atual" | "chegada" | "total";

interface ChartRow {
  name: string;
  base: number;
  valor: number;
  tipo: TipoBarra;
  pecas: { sku: string; marca: string; modelo: string }[];
}

const CORES: Record<TipoBarra, string> = {
  atual: "#3b82f6", // azul — estoque atual
  chegada: "#f59e0b", // âmbar — chegadas projetadas
  total: "#10b981", // verde — total previsto
};

function buildRows(data: PrevisaoData): ChartRow[] {
  const rows: ChartRow[] = [
    {
      name: "Estoque Atual",
      base: 0,
      valor: data.estoqueAtual,
      tipo: "atual",
      pecas: [],
    },
  ];

  let acumulado = data.estoqueAtual;
  for (const c of data.chegadas) {
    rows.push({
      name: c.label,
      base: acumulado,
      valor: c.quantidade,
      tipo: "chegada",
      pecas: c.pecas,
    });
    acumulado += c.quantidade;
  }

  rows.push({
    name: "Total Previsto",
    base: 0,
    valor: data.totalPrevisto,
    tipo: "total",
    pecas: [],
  });

  return rows;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm max-w-xs">
      {row.tipo === "atual" && (
        <p>
          <span className="font-semibold">{row.valor}</span> peça(s) disponível(is)
          fisicamente hoje
        </p>
      )}
      {row.tipo === "total" && (
        <p>
          Total previsto: <span className="font-semibold">{row.valor}</span> peça(s)
        </p>
      )}
      {row.tipo === "chegada" && (
        <div className="space-y-1">
          <p className="font-semibold">
            {row.name} — {row.valor} chegando
          </p>
          <ul className="text-muted-foreground list-disc list-inside max-h-48 overflow-auto">
            {row.pecas.map((p) => (
              <li key={p.sku}>
                {p.marca} {p.modelo}{" "}
                <span className="text-xs opacity-70">({p.sku})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PrevisaoChegadasChart({ data }: { data: PrevisaoData }) {
  const rows = buildRows(data);

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={rows} margin={{ top: 24, right: 16, left: 0, bottom: 24 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={rows.length > 8 ? -35 : 0}
          textAnchor={rows.length > 8 ? "end" : "middle"}
          height={rows.length > 8 ? 60 : 30}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        {/* Base invisível para criar o efeito cascata */}
        <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="valor" stackId="a" radius={[4, 4, 0, 0]}>
          {rows.map((row) => (
            <Cell key={row.name} fill={CORES[row.tipo]} />
          ))}
          <LabelList dataKey="valor" position="top" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
