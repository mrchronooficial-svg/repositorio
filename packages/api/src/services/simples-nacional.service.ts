/**
 * Simples Nacional — Anexo I (Comércio)
 *
 * Calcula a alíquota efetiva do Simples Nacional com base no RBT12
 * (Receita Bruta acumulada dos últimos 12 meses).
 *
 * Fórmula: Alíquota Efetiva = (RBT12 × Alíquota Nominal − Parcela a Deduzir) / RBT12
 *
 * Referência: LC 123/2006, Anexo I — Comércio
 */

import prisma from "@gestaomrchrono/db";

// Tabela do Simples Nacional — Anexo I (Comércio)
// Faixas de receita bruta acumulada nos últimos 12 meses (RBT12)
const FAIXAS_ANEXO_I = [
  { faixa: 1, limiteInferior: 0,          limiteSuperior: 180_000,     aliquotaNominal: 0.04,   parcelaDeduzir: 0 },
  { faixa: 2, limiteInferior: 180_000.01, limiteSuperior: 360_000,     aliquotaNominal: 0.073,  parcelaDeduzir: 5_940 },
  { faixa: 3, limiteInferior: 360_000.01, limiteSuperior: 720_000,     aliquotaNominal: 0.095,  parcelaDeduzir: 13_860 },
  { faixa: 4, limiteInferior: 720_000.01, limiteSuperior: 1_800_000,   aliquotaNominal: 0.107,  parcelaDeduzir: 22_500 },
  { faixa: 5, limiteInferior: 1_800_000.01, limiteSuperior: 3_600_000, aliquotaNominal: 0.143,  parcelaDeduzir: 87_300 },
  { faixa: 6, limiteInferior: 3_600_000.01, limiteSuperior: 4_800_000, aliquotaNominal: 0.19,   parcelaDeduzir: 378_000 },
];

/**
 * Encontra a faixa do Simples Nacional para um dado RBT12
 */
function encontrarFaixa(rbt12: number) {
  return FAIXAS_ANEXO_I.find(
    (f) => rbt12 >= f.limiteInferior && rbt12 <= f.limiteSuperior
  );
}

/**
 * Calcula a alíquota efetiva do Simples Nacional
 *
 * @param rbt12 - Receita Bruta Total acumulada nos últimos 12 meses
 * @returns Alíquota efetiva (ex: 0.04 = 4%)
 */
export function calcularAliquotaEfetiva(rbt12: number): number {
  // Se RBT12 é zero, usa a primeira faixa (4%)
  if (rbt12 <= 0) {
    return FAIXAS_ANEXO_I[0]!.aliquotaNominal;
  }

  const faixa = encontrarFaixa(rbt12);

  if (!faixa) {
    // Acima do limite do Simples Nacional — empresa desenquadrada
    // Usa a maior alíquota como fallback
    const ultimaFaixa = FAIXAS_ANEXO_I[FAIXAS_ANEXO_I.length - 1]!;
    return (rbt12 * ultimaFaixa.aliquotaNominal - ultimaFaixa.parcelaDeduzir) / rbt12;
  }

  // Fórmula: (RBT12 × Alíquota Nominal − Parcela a Deduzir) / RBT12
  const aliquotaEfetiva = (rbt12 * faixa.aliquotaNominal - faixa.parcelaDeduzir) / rbt12;

  return aliquotaEfetiva;
}

/**
 * Calcula o RBT12 (Receita Bruta Total dos últimos 12 meses)
 * com base nas vendas registradas no sistema.
 *
 * Para consignação, considera apenas a margem (valor final - repasse).
 *
 * @param dataReferencia - Data de referência para o cálculo (default: hoje)
 * @returns RBT12 em reais
 */
export async function calcularRBT12(dataReferencia?: Date): Promise<number> {
  const ref = dataReferencia || new Date();

  // Início: 12 meses atrás do primeiro dia do mês de referência
  const inicio = new Date(ref.getFullYear(), ref.getMonth() - 12, 1);
  // Fim: último dia do mês anterior ao de referência
  const fim = new Date(ref.getFullYear(), ref.getMonth(), 0, 23, 59, 59);

  const vendas = await prisma.venda.findMany({
    where: {
      cancelada: false,
      dataVenda: {
        gte: inicio,
        lte: fim,
      },
    },
    select: {
      valorFinal: true,
      valorRepasseDevido: true,
      peca: {
        select: {
          origemTipo: true,
        },
      },
    },
  });

  let rbt12 = 0;

  for (const venda of vendas) {
    const valorFinal = Number(venda.valorFinal);

    if (venda.peca.origemTipo === "CONSIGNACAO" && venda.valorRepasseDevido) {
      // Consignação: receita bruta = margem (valor final - repasse)
      rbt12 += valorFinal - Number(venda.valorRepasseDevido);
    } else {
      // Estoque próprio: receita bruta = valor final
      rbt12 += valorFinal;
    }
  }

  return rbt12;
}

/**
 * Calcula o imposto do Simples Nacional para uma venda específica.
 *
 * @param valorBase - Valor sobre o qual incide o imposto
 *   - Estoque próprio: valor final da venda
 *   - Consignação: apenas a margem (valor final - repasse)
 * @param rbt12 - RBT12 já calculado (para evitar recalcular em cada venda)
 * @returns Objeto com alíquota efetiva e valor do imposto
 */
export function calcularImpostoVenda(
  valorBase: number,
  rbt12: number
): { aliquotaEfetiva: number; valorImposto: number } {
  const aliquotaEfetiva = calcularAliquotaEfetiva(rbt12);
  const valorImposto = valorBase * aliquotaEfetiva;

  return {
    aliquotaEfetiva: Math.round(aliquotaEfetiva * 10000) / 10000, // 4 casas decimais
    valorImposto: Math.round(valorImposto * 100) / 100, // 2 casas decimais
  };
}
