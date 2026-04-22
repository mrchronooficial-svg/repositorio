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
