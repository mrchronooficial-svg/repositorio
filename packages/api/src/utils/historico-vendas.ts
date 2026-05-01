// Dados historicos de vendas por dia do mes (acumulado de pecas vendidas).
// Fonte unica de verdade usada tanto pelo grafico "Pace de Vendas" quanto
// pelo grafico "Evolucao de Vendas" no dashboard.
//
// Para meses cobertos aqui, os totais vem desta fonte; do mes seguinte ao
// ultimo registro (Fev/2026 em diante) os dados sao lidos do banco.

export type HistoricoMes = {
  mes: string; // "Jan", "Fev", ...
  ano: number;
  // Acumulado por dia do mes (indice 0 = dia 1)
  dados: Array<{ dia: number; acumulado: number }>;
};

const acumulado = (arr: number[]): Array<{ dia: number; acumulado: number }> =>
  arr.map((v, i) => ({ dia: i + 1, acumulado: v }));

export const HISTORICO_VENDAS: HistoricoMes[] = [
  { mes: "Jun", ano: 2025, dados: acumulado([0,0,1,2,3,5,8,10,11,11,11,11,12,12,12,15,15,15,16,17,17,17,17,17,18,21,22,24,24,24]) },
  { mes: "Jul", ano: 2025, dados: acumulado([0,2,2,2,2,2,3,3,4,7,8,8,11,14,15,15,15,15,15,15,16,18,19,20,20,20,23,25,25,25,25]) },
  { mes: "Ago", ano: 2025, dados: acumulado([0,1,1,1,6,8,8,9,9,9,10,11,11,13,13,13,14,16,16,17,18,18,18,18,19,20,20,21,23,24,24]) },
  { mes: "Set", ano: 2025, dados: acumulado([1,1,1,1,2,2,4,5,6,7,9,11,11,11,13,13,13,13,13,13,13,15,18,19,21,23,23,25,26,26]) },
  { mes: "Out", ano: 2025, dados: acumulado([2,2,4,5,6,6,6,6,10,11,11,11,13,15,16,16,17,18,19,19,21,24,25,25,27,27,29,31,32,35,35]) },
  { mes: "Nov", ano: 2025, dados: acumulado([0,0,1,2,2,3,4,4,5,6,6,8,11,13,13,15,16,17,19,19,20,21,21,21,21,22,24,25,26,28]) },
  { mes: "Dez", ano: 2025, dados: acumulado([1,2,4,4,4,4,6,6,8,8,8,8,8,9,10,10,10,10,11,11,13,13,13,15,16,17,19,20,20,20,20]) },
  { mes: "Jan", ano: 2026, dados: acumulado([0,0,0,0,0,4,6,7,7,7,8,11,14,14,14,17,18,21,21,23,24,27,32,34,36,38,40,42,43,46,51]) },
];

// Total final do mes (ultimo acumulado)
export function totalDoMes(h: HistoricoMes): number {
  return h.dados[h.dados.length - 1]?.acumulado ?? 0;
}

// Mapa { "YYYY-MM" -> total } para lookup rapido por mes
export const HISTORICO_TOTAIS: Map<string, number> = new Map(
  HISTORICO_VENDAS.map((h) => {
    const nomesMeses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const mesIdx = nomesMeses.indexOf(h.mes);
    const key = `${h.ano}-${String(mesIdx).padStart(2, "0")}`;
    return [key, totalDoMes(h)];
  })
);

// Indices dos meses (compartilhado)
export const NOMES_MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
