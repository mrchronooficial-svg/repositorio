export const SECTION_IDS = [
  "utensilios",
  "kpiEstoque",
  "kpiVendas",
  "kpiFaturamento",
  "kpiLucroBruto",
  "kpiMargemBruta",
  "kpiReceber",
  "kpiPagar",
  "kpiEstoqueCusto",
  "kpiEstoqueFaturamento",
  "kpiClientes",
  "kpiEmRevisao",
  "graficos",
  "listas",
  "recebiveis",
  "paceVendas",
  "dividas",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export interface GridItem {
  i: SectionId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayout {
  grid: GridItem[];
  hiddenSections: SectionId[];
}

export const DEFAULT_GRID_LAYOUT: GridItem[] = [
  { i: "utensilios",          x: 0, y: 0,  w: 8, h: 1 },
  { i: "kpiEstoque",          x: 0, y: 1,  w: 2, h: 1 },
  { i: "kpiVendas",           x: 2, y: 1,  w: 2, h: 1 },
  { i: "kpiFaturamento",      x: 4, y: 1,  w: 2, h: 1 },
  { i: "kpiLucroBruto",       x: 6, y: 1,  w: 2, h: 1 },
  { i: "kpiMargemBruta",      x: 0, y: 2,  w: 2, h: 1 },
  { i: "kpiReceber",          x: 2, y: 2,  w: 2, h: 1 },
  { i: "kpiPagar",            x: 4, y: 2,  w: 2, h: 1 },
  { i: "kpiEstoqueCusto",     x: 6, y: 2,  w: 2, h: 1 },
  { i: "kpiEstoqueFaturamento", x: 0, y: 3, w: 2, h: 1 },
  { i: "kpiClientes",         x: 2, y: 3,  w: 2, h: 1 },
  { i: "kpiEmRevisao",        x: 4, y: 3,  w: 2, h: 1 },
  { i: "graficos",            x: 0, y: 4,  w: 8, h: 2 },
  { i: "listas",              x: 0, y: 6,  w: 8, h: 2 },
  { i: "paceVendas",          x: 0, y: 8,  w: 8, h: 3 },
  { i: "recebiveis",          x: 0, y: 11, w: 8, h: 1 },
  { i: "dividas",             x: 0, y: 12, w: 8, h: 1 },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  grid: DEFAULT_GRID_LAYOUT,
  hiddenSections: [],
};

export const SECTION_LABELS: Record<SectionId, string> = {
  utensilios: "Utensilios de Embalagem",
  kpiEstoque: "Pecas em Estoque",
  kpiVendas: "Vendas do Mes",
  kpiFaturamento: "Faturamento do Mes",
  kpiLucroBruto: "Lucro Bruto do Mes",
  kpiMargemBruta: "Margem Bruta",
  kpiReceber: "A Receber",
  kpiPagar: "A Pagar (Fornecedores)",
  kpiEstoqueCusto: "Estoque (Custo)",
  kpiEstoqueFaturamento: "Estoque (Faturamento)",
  kpiClientes: "Clientes",
  kpiEmRevisao: "Em Revisao",
  graficos: "Graficos",
  listas: "Vendas Recentes / Revisao",
  paceVendas: "Pace de Vendas",
  recebiveis: "Recebiveis Pendentes",
  dividas: "Repasses / Pagamentos",
};
