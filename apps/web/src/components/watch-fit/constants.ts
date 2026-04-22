// Lista alfabética de marcas (com "Outra" no fim para campo aberto)
export const MARCAS = [
  "Audemars Piguet",
  "Bell & Ross",
  "Blancpain",
  "Breguet",
  "Breitling",
  "Bulgari",
  "Cartier",
  "Chopard",
  "F.P. Journe",
  "Girard-Perregaux",
  "Grand Seiko",
  "Hublot",
  "IWC",
  "Jaeger-LeCoultre",
  "Longines",
  "Montblanc",
  "Nomos",
  "Omega",
  "Panerai",
  "Patek Philippe",
  "Piaget",
  "Richard Mille",
  "Rolex",
  "Seiko",
  "TAG Heuer",
  "Tudor",
  "Ulysse Nardin",
  "Vacheron Constantin",
  "Zenith",
  "Outra",
] as const;

export const ESTILOS = ["Vintage", "Moderno"] as const;

export const TIPOS_PULSEIRA = [
  "Aço",
  "Couro",
  "Borracha/Silicone",
  "Nato/Tecido",
  "Jubilee",
  "Presidencial",
] as const;

export const CORES_MOSTRADOR = [
  { label: "Preto", hex: "#1A1A1A" },
  { label: "Branco", hex: "#F4F1EC" },
  { label: "Azul", hex: "#1E3A5F" },
  { label: "Verde", hex: "#1F4E3D" },
  { label: "Champagne/Dourado", hex: "#C5A35A" },
  { label: "Cinza/Prata", hex: "#A8AFB4" },
  { label: "Outra", hex: "" }, // gradient especial
] as const;

export const TAMANHOS_CAIXA = [
  "Até 36mm",
  "37–39mm",
  "40–42mm",
  "43mm+",
  "Sem preferência",
] as const;

export const FAIXAS_INVESTIMENTO = [
  "Até R$5.000",
  "R$5.000–R$15.000",
  "R$15.000–R$30.000",
  "R$30.000–R$60.000",
  "R$60.000–R$100.000",
  "Acima de R$100.000",
  "Prefiro não informar",
] as const;

export const CONDICOES = [
  { label: "Completo (box + docs)", value: "COMPLETO" },
  { label: "Somente relógio", value: "SOMENTE_RELOGIO" },
  { label: "Tanto faz", value: "TANTO_FAZ" },
] as const;

// Link configurável para "Voltar ao site" na tela de sucesso
export const SITE_URL = "https://www.instagram.com/mrchrono";
