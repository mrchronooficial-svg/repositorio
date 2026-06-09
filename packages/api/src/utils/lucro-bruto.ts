// Calculo do Lucro Bruto de uma venda.
//
// Definicao (fonte unica de verdade — usada em dashboard e listagens):
//
// COMPRA (estoque proprio):
//   lucroBruto = valorFinal - MDR - imposto - valorCompra - custoManutencao
//
// CONSIGNACAO:
//   lucroBruto = valorFinal - MDR - imposto - valorRepasseDevido
//   (custoManutencao na consignacao e responsabilidade do consignante)
//
// Onde:
//   MDR     = valorFinal x taxaMDR/100, somente se forma de pagamento != PIX
//   imposto = baseSimples x aliquotaEfetiva
//     baseSimples = valorFinal - repasse (CONSIGNACAO) ou valorFinal (COMPRA)
//     aliquotaEfetiva: configuracao "ALIQUOTA_SIMPLES" — fixa ("5.00")
//                      ou "auto" (calculada via RBT12 do periodo)

import prisma from "@gestaomrchrono/db";
import { calcularImpostoVenda, calcularRBT12 } from "../services/simples-nacional.service";

export interface LucroBrutoVenda {
  valorFinal: number;
  formaPagamento: string;
  taxaMDR: number;
  valorRepasseDevido: number | null;
  origemTipo: string; // "COMPRA" | "CONSIGNACAO"
  valorCompra: number;
  custoManutencao: number;
}

export interface ImpostoConfig {
  // "auto" para calculo via RBT12; ou string numerica (ex: "5.00") para fixa
  aliquotaConfig: string;
  // RBT12 requerido apenas quando aliquotaConfig === "auto"
  rbt12: number | null;
}

// Carrega config + RBT12 (chamar uma vez por requisicao, nao por venda)
export async function carregarImpostoConfig(): Promise<ImpostoConfig> {
  const configAliquota = await prisma.configuracao.findUnique({
    where: { chave: "ALIQUOTA_SIMPLES" },
  });
  const aliquotaConfig = configAliquota?.valor || "auto";
  let rbt12: number | null = null;
  if (aliquotaConfig === "auto") {
    rbt12 = await calcularRBT12();
  }
  return { aliquotaConfig, rbt12 };
}

export function calcularLucroBruto(
  v: LucroBrutoVenda,
  cfg: ImpostoConfig
): number {
  const isConsignacao = v.origemTipo === "CONSIGNACAO";
  const repasse = v.valorRepasseDevido || 0;

  // 1. Receita liquida do custo direto da peca/repasse
  let lucro: number;
  let baseSimples: number;
  if (isConsignacao) {
    lucro = v.valorFinal - repasse;
    baseSimples = v.valorFinal - repasse; // margem
  } else {
    lucro = v.valorFinal - v.valorCompra - v.custoManutencao;
    baseSimples = v.valorFinal;
  }

  // 2. MDR (taxa de cartao)
  if (v.formaPagamento !== "PIX" && v.taxaMDR > 0) {
    const valorMDR = Math.round(v.valorFinal * (v.taxaMDR / 100) * 100) / 100;
    lucro -= valorMDR;
  }

  // 3. Simples Nacional
  if (cfg.aliquotaConfig !== "auto") {
    const aliquotaEfetiva = parseFloat(cfg.aliquotaConfig) / 100;
    lucro -= Math.round(baseSimples * aliquotaEfetiva * 100) / 100;
  } else if (cfg.rbt12 !== null) {
    const { valorImposto } = calcularImpostoVenda(baseSimples, cfg.rbt12);
    lucro -= valorImposto;
  }

  return Math.round(lucro * 100) / 100;
}

export interface LucroBrutoEstoquePeca {
  valorVenda: number; // valorFinal (se vendida) ou valorEstimadoVenda
  origemTipo: string; // "COMPRA" | "CONSIGNACAO"
  valorCompra: number;
  valorRepasse: number | null;
  percentualRepasse: number | null;
}

// Lucro bruto estimado de uma peca de estoque, JA liquido de imposto (Simples).
// Mesma base da coluna "Lucro Bruto" da listagem (valorVenda - custo), porem
// descontando o Simples Nacional. NAO desconta MDR (a forma de pagamento so e
// conhecida na venda) nem custo de manutencao.
export function calcularLucroBrutoEstoque(
  p: LucroBrutoEstoquePeca,
  cfg: ImpostoConfig
): number {
  if (!p.valorVenda) return 0;
  const isConsignacao = p.origemTipo === "CONSIGNACAO";

  let custo: number;
  if (isConsignacao) {
    if (p.valorRepasse) {
      custo = p.valorRepasse;
    } else if (p.percentualRepasse) {
      custo = p.valorVenda * (p.percentualRepasse / 100);
    } else {
      custo = 0;
    }
  } else {
    custo = p.valorCompra || 0;
  }

  let lucro = p.valorVenda - custo;

  // Base do Simples: receita cheia (COMPRA) ou margem (CONSIGNACAO)
  const baseSimples = isConsignacao ? p.valorVenda - custo : p.valorVenda;

  if (cfg.aliquotaConfig !== "auto") {
    const aliquotaEfetiva = parseFloat(cfg.aliquotaConfig) / 100;
    lucro -= Math.round(baseSimples * aliquotaEfetiva * 100) / 100;
  } else if (cfg.rbt12 !== null) {
    const { valorImposto } = calcularImpostoVenda(baseSimples, cfg.rbt12);
    lucro -= valorImposto;
  }

  return Math.round(lucro * 100) / 100;
}
