export const STATUS_PECA = {
  DISPONIVEL: "DISPONIVEL",
  EM_TRANSITO: "EM_TRANSITO",
  REVISAO: "REVISAO",
  VENDIDA: "VENDIDA",
  DEFEITO: "DEFEITO",
  PERDA: "PERDA",
} as const;

export const STATUS_PECA_LABELS: Record<string, string> = {
  DISPONIVEL: "Disponível",
  EM_TRANSITO: "Em Trânsito",
  REVISAO: "Em Revisão",
  VENDIDA: "Vendida",
  DEFEITO: "Defeito",
  PERDA: "Perda",
};

export const STATUS_PECA_COLORS: Record<string, string> = {
  DISPONIVEL: "bg-green-100 text-green-800",
  EM_TRANSITO: "bg-blue-100 text-blue-800",
  REVISAO: "bg-yellow-100 text-yellow-800",
  VENDIDA: "bg-gray-100 text-gray-800",
  DEFEITO: "bg-red-100 text-red-800",
  PERDA: "bg-red-100 text-red-800",
};

export const STATUS_PAGAMENTO_LABELS: Record<string, string> = {
  PAGO: "Pago",
  PARCIAL: "Parcial",
  NAO_PAGO: "Não Pago",
};

export const STATUS_PAGAMENTO_COLORS: Record<string, string> = {
  PAGO: "bg-green-100 text-green-800",
  PARCIAL: "bg-yellow-100 text-yellow-800",
  NAO_PAGO: "bg-red-100 text-red-800",
};

export const STATUS_REPASSE_LABELS: Record<string, string> = {
  FEITO: "Feito",
  PARCIAL: "Parcial",
  PENDENTE: "Pendente",
};

export const STATUS_REPASSE_COLORS: Record<string, string> = {
  FEITO: "bg-green-100 text-green-800",
  PARCIAL: "bg-yellow-100 text-yellow-800",
  PENDENTE: "bg-red-100 text-red-800",
};

export const STATUS_ENVIO_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
};

export const STATUS_ENVIO_COLORS: Record<string, string> = {
  PENDENTE: "bg-orange-100 text-orange-800",
  ENVIADO: "bg-green-100 text-green-800",
  ENTREGUE: "bg-blue-100 text-blue-800",
};

export const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  PIX: "PIX",
  CREDITO_VISTA: "Crédito à Vista",
  CREDITO_PARCELADO: "Crédito Parcelado",
};

export const TIPO_PESSOA_LABELS: Record<string, string> = {
  PESSOA_FISICA: "Pessoa Física",
  PESSOA_JURIDICA: "Pessoa Jurídica",
};

export const ORIGEM_TIPO_LABELS: Record<string, string> = {
  COMPRA: "Compra",
  CONSIGNACAO: "Consignação",
};

export const ORIGEM_CANAL_LABELS: Record<string, string> = {
  PESSOA_FISICA: "Pessoa Física",
  LEILAO_BRASIL: "Leilão Brasil",
  EBAY: "eBay",
};

export const SCORE_LABELS: Record<string, string> = {
  EXCELENTE: "Excelente",
  BOM: "Bom",
  REGULAR: "Regular",
  RUIM: "Ruim",
};

export const SCORE_COLORS: Record<string, string> = {
  EXCELENTE: "bg-green-100 text-green-800",
  BOM: "bg-blue-100 text-blue-800",
  REGULAR: "bg-yellow-100 text-yellow-800",
  RUIM: "bg-red-100 text-red-800",
};

export const NIVEL_ACESSO_LABELS: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  SOCIO: "Sócio",
  FUNCIONARIO: "Funcionário",
};

export const STATUS_NFE_LABELS: Record<string, string> = {
  DECLARADA: "Declarada",
  NAO_DECLARADA: "Nao Declarada",
};

export const STATUS_NFE_COLORS: Record<string, string> = {
  DECLARADA: "bg-green-100 text-green-800",
  NAO_DECLARADA: "bg-red-100 text-red-800",
};

export const LOCALIZACOES_PADRAO = [
  "Rafael",
  "Pedro",
  "Heitor",
  "Tampograth",
  "Fornecedor",
  "Cliente Final",
];
