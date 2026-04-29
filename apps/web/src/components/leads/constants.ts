// Mapa de status → cores + label PT-BR
// Cores seguem a paleta do spec: novo azul, em contato âmbar,
// negociando roxo, convertido verde, arquivado cinza.

export type StatusLead =
  | "NOVO"
  | "EM_CONTATO"
  | "NEGOCIANDO"
  | "CONVERTIDO"
  | "ARQUIVADO";

export interface StatusInfo {
  value: StatusLead;
  label: string;
  // Classes Tailwind para badge (background + texto + borda)
  badgeClass: string;
  // Cor sólida para timeline/ícones
  dot: string;
}

export const STATUS_LIST: StatusInfo[] = [
  {
    value: "NOVO",
    label: "Novo",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
  },
  {
    value: "EM_CONTATO",
    label: "Em contato",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  {
    value: "NEGOCIANDO",
    label: "Negociando",
    badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
    dot: "bg-violet-500",
  },
  {
    value: "CONVERTIDO",
    label: "Convertido",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    value: "ARQUIVADO",
    label: "Arquivado",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
];

export const STATUS_MAP: Record<StatusLead, StatusInfo> = STATUS_LIST.reduce(
  (acc, s) => ({ ...acc, [s.value]: s }),
  {} as Record<StatusLead, StatusInfo>,
);

// Tipo de busca
export type TipoBuscaLead = "ESPECIFICO" | "DESCOBERTA";

export const TIPO_BUSCA_LABEL: Record<TipoBuscaLead, string> = {
  ESPECIFICO: "Encomenda",
  DESCOBERTA: "Curadoria",
};

// Condição do modelo
export const CONDICAO_LABEL: Record<string, string> = {
  COMPLETO: "Completo (box + docs)",
  SOMENTE_RELOGIO: "Somente relógio",
  TANTO_FAZ: "Tanto faz",
};

// =============================================
// VIP CHRONO — enums e labels
// =============================================

export type FaixaRendaAnualVip =
  | "ATE_100K"
  | "DE_100K_A_250K"
  | "DE_250K_A_500K"
  | "DE_500K_A_1M"
  | "ACIMA_1M"
  | "PREFIRO_NAO_INFORMAR";

export const FAIXA_RENDA_LABEL: Record<FaixaRendaAnualVip, string> = {
  ATE_100K: "Até R$ 100.000",
  DE_100K_A_250K: "R$ 100.000 – R$ 250.000",
  DE_250K_A_500K: "R$ 250.000 – R$ 500.000",
  DE_500K_A_1M: "R$ 500.000 – R$ 1.000.000",
  ACIMA_1M: "Acima de R$ 1.000.000",
  PREFIRO_NAO_INFORMAR: "Prefiro não informar",
};

export const FAIXA_RENDA_LIST: { value: FaixaRendaAnualVip; label: string }[] = [
  { value: "ATE_100K", label: FAIXA_RENDA_LABEL.ATE_100K },
  { value: "DE_100K_A_250K", label: FAIXA_RENDA_LABEL.DE_100K_A_250K },
  { value: "DE_250K_A_500K", label: FAIXA_RENDA_LABEL.DE_250K_A_500K },
  { value: "DE_500K_A_1M", label: FAIXA_RENDA_LABEL.DE_500K_A_1M },
  { value: "ACIMA_1M", label: FAIXA_RENDA_LABEL.ACIMA_1M },
  { value: "PREFIRO_NAO_INFORMAR", label: FAIXA_RENDA_LABEL.PREFIRO_NAO_INFORMAR },
];

export type ObjetivoComunidadeVip =
  | "MELHORES_PRECOS"
  | "NETWORKING"
  | "EVENTOS"
  | "ACESSO_ANTECIPADO"
  | "WATCH_HUNT";

export const OBJETIVO_COMUNIDADE_LABEL: Record<ObjetivoComunidadeVip, string> = {
  MELHORES_PRECOS: "Melhores preços de relógios",
  NETWORKING: "Networking",
  EVENTOS: "Eventos",
  ACESSO_ANTECIPADO: "Acesso antecipado às peças",
  WATCH_HUNT: "Serviço de Watch Hunt",
};

export const OBJETIVO_COMUNIDADE_LIST: { value: ObjetivoComunidadeVip; label: string }[] = [
  { value: "MELHORES_PRECOS", label: OBJETIVO_COMUNIDADE_LABEL.MELHORES_PRECOS },
  { value: "NETWORKING", label: OBJETIVO_COMUNIDADE_LABEL.NETWORKING },
  { value: "EVENTOS", label: OBJETIVO_COMUNIDADE_LABEL.EVENTOS },
  { value: "ACESSO_ANTECIPADO", label: OBJETIVO_COMUNIDADE_LABEL.ACESSO_ANTECIPADO },
  { value: "WATCH_HUNT", label: OBJETIVO_COMUNIDADE_LABEL.WATCH_HUNT },
];

// Cores discretas por tipo de objetivo — para diferenciar visualmente os badges
export const OBJETIVO_COMUNIDADE_BADGE_CLASS: Record<ObjetivoComunidadeVip, string> = {
  MELHORES_PRECOS: "border-emerald-200 bg-emerald-50 text-emerald-800",
  NETWORKING: "border-sky-200 bg-sky-50 text-sky-800",
  EVENTOS: "border-violet-200 bg-violet-50 text-violet-800",
  ACESSO_ANTECIPADO: "border-amber-200 bg-amber-50 text-amber-800",
  WATCH_HUNT: "border-rose-200 bg-rose-50 text-rose-800",
};

// Versão curta para resumo em tabela
export const OBJETIVO_COMUNIDADE_SHORT: Record<ObjetivoComunidadeVip, string> = {
  MELHORES_PRECOS: "Preços",
  NETWORKING: "Networking",
  EVENTOS: "Eventos",
  ACESSO_ANTECIPADO: "Antecipado",
  WATCH_HUNT: "Watch Hunt",
};
