// Utilitarios de data para horario de Brasilia (BRT, UTC-3)
// Brasil nao observa horario de verao desde 2019, entao o offset e fixo.
// Usado para garantir que vendas/agrupamentos por mes respeitem o fuso do
// usuario, mesmo quando o servidor (Vercel) roda em UTC.

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;

// Componentes de data em BRT (year, month 0..11, day, etc.) a partir de um Date
export function brtParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const ms = date.getTime() + BRT_OFFSET_MS;
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

// Instante UTC correspondente ao inicio do mes informado em BRT
// Ex: brtMonthStart(2026, 3) => 2026-04-01T03:00:00Z (= 00:00 BRT)
export function brtMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1, 3, 0, 0, 0));
}

// Instante UTC correspondente ao inicio do mes seguinte (use com filtro `lt`)
export function brtMonthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 1, 3, 0, 0, 0));
}

// Mes/ano em BRT da data informada
export function brtMonthOf(date: Date): { year: number; month: number } {
  const p = brtParts(date);
  return { year: p.year, month: p.month };
}

// "Hoje" no fuso de Brasilia (componentes ano/mes/dia)
export function brtToday(): { year: number; month: number; day: number } {
  const p = brtParts(new Date());
  return { year: p.year, month: p.month, day: p.day };
}
