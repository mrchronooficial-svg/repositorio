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
  "dividas",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export type SectionWidth = 1 | 2 | 3 | 4;
export type SectionHeight = 1 | 2 | 3;

export interface SectionDimensions {
  w: SectionWidth;
  h: SectionHeight;
}

export interface DashboardLayout {
  sectionOrder: SectionId[];
  hiddenSections: SectionId[];
  sectionDimensions: Partial<Record<SectionId, SectionDimensions>>;
}

export const DEFAULT_DIMENSIONS: Record<SectionId, SectionDimensions> = {
  utensilios: { w: 4, h: 1 },
  kpiEstoque: { w: 1, h: 1 },
  kpiVendas: { w: 1, h: 1 },
  kpiFaturamento: { w: 1, h: 1 },
  kpiLucroBruto: { w: 1, h: 1 },
  kpiMargemBruta: { w: 1, h: 1 },
  kpiReceber: { w: 1, h: 1 },
  kpiPagar: { w: 1, h: 1 },
  kpiEstoqueCusto: { w: 1, h: 1 },
  kpiEstoqueFaturamento: { w: 1, h: 1 },
  kpiClientes: { w: 1, h: 1 },
  kpiEmRevisao: { w: 1, h: 1 },
  graficos: { w: 4, h: 1 },
  listas: { w: 4, h: 1 },
  recebiveis: { w: 4, h: 1 },
  dividas: { w: 4, h: 1 },
};

export const DEFAULT_SECTION_ORDER: SectionId[] = [...SECTION_IDS];

export const DEFAULT_LAYOUT: DashboardLayout = {
  sectionOrder: DEFAULT_SECTION_ORDER,
  hiddenSections: [],
  sectionDimensions: {},
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
  recebiveis: "Recebiveis Pendentes",
  dividas: "Repasses / Pagamentos",
};
