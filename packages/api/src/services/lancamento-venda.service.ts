/**
 * Lançamento automático de vendas — Serviço de integração financeira
 *
 * Gera lançamentos contábeis automáticos ao registrar ou cancelar uma venda:
 *
 * ESTOQUE PRÓPRIO:
 *   1. Receita bruta: D Caixa/Contas a Receber → C 3.1.1 Venda Estoque Próprio
 *   2. MDR (se cartão): D 3.2.1 MDR → C Caixa
 *   3. Simples Nacional: D 3.2.2 Simples → C 2.1.2.01 Simples a Recolher
 *   4. CMV: D 4.1.x Custo Aquisição → C 1.1.3.01 Estoque
 *
 * CONSIGNAÇÃO:
 *   1. Receita (margem): D Caixa/Contas a Receber → C 3.1.2 Venda Consignação
 *   2. Passivo repasse: D Caixa/Contas a Receber → C 2.1.1.01 Repasse Consignação
 *   3. MDR (se cartão): D 3.2.1 MDR → C Caixa
 *   4. Simples (sobre margem): D 3.2.2 Simples → C 2.1.2.01 Simples a Recolher
 */

import prisma from "@gestaomrchrono/db";
import { calcularRBT12, calcularImpostoVenda } from "./simples-nacional.service";

// Códigos fixos do plano de contas
const CONTAS = {
  // Ativo
  NUBANK: "1.1.1.01",
  PAGBANK: "1.1.1.02",
  CONTAS_A_RECEBER: "1.1.2.01",
  ESTOQUE_PROPRIO: "1.1.3.01",
  // Passivo
  REPASSE_CONSIGNACAO: "2.1.1.01",
  SIMPLES_A_RECOLHER: "2.1.2.01",
  // Receitas
  RECEITA_ESTOQUE_PROPRIO: "3.1.1",
  RECEITA_CONSIGNACAO: "3.1.2",
  MDR_TAXA_CARTAO: "3.2.1",
  SIMPLES_NACIONAL: "3.2.2",
  // CMV
  CMV_LEILAO: "4.1.1",
  CMV_EBAY: "4.1.2",
  CMV_PF: "4.1.3",
  CMV_MANUTENCAO: "4.1.4",
};

/**
 * Busca os IDs de todas as contas necessárias de uma vez.
 * Returns a Map for type-safe lookups.
 */
async function buscarContasMap(): Promise<Map<string, string>> {
  const codigos = Object.values(CONTAS);
  const contas = await prisma.contaContabil.findMany({
    where: { codigo: { in: codigos } },
    select: { id: true, codigo: true },
  });

  const map = new Map<string, string>();
  for (const c of contas) {
    map.set(c.codigo, c.id);
  }

  // Verificar se todas as contas foram encontradas
  const faltantes = codigos.filter((cod) => !map.has(cod));
  if (faltantes.length > 0) {
    throw new Error(
      `Contas contábeis não encontradas no plano de contas: ${faltantes.join(", ")}. Execute o seed financeiro primeiro.`
    );
  }

  return map;
}

/** Helper to get conta ID from map (guaranteed to exist after validation) */
function getConta(map: Map<string, string>, codigo: string): string {
  return map.get(codigo)!;
}

/**
 * Determina a conta de entrada de caixa baseada no meio de pagamento
 */
function getContaEntrada(
  formaPagamento: string,
  contasMap: Map<string, string>
): string {
  switch (formaPagamento) {
    case "PIX":
      return getConta(contasMap, CONTAS.NUBANK);
    case "CREDITO_VISTA":
    case "CREDITO_PARCELADO":
      return getConta(contasMap, CONTAS.CONTAS_A_RECEBER);
    default:
      return getConta(contasMap, CONTAS.NUBANK);
  }
}

/**
 * Determina a conta CMV baseada na origem da peça
 */
function getContaCMV(
  origemCanal: string | null,
  contasMap: Map<string, string>
): string {
  switch (origemCanal) {
    case "LEILAO_BRASIL":
      return getConta(contasMap, CONTAS.CMV_LEILAO);
    case "EBAY":
      return getConta(contasMap, CONTAS.CMV_EBAY);
    case "PESSOA_FISICA":
      return getConta(contasMap, CONTAS.CMV_PF);
    default:
      return getConta(contasMap, CONTAS.CMV_LEILAO);
  }
}

interface VendaParaLancamento {
  id: string;
  valorFinal: number;
  formaPagamento: string;
  taxaMDR: number;
  valorRepasseDevido: number | null;
  dataVenda: Date;
  peca: {
    sku: string;
    origemTipo: string;
    origemCanal: string | null;
    valorCompra: number;
    custoManutencao: number | null;
  };
}

/**
 * Cria lançamentos contábeis automáticos para uma venda.
 *
 * @param venda - Dados da venda
 * @param userId - ID do usuário que realizou a venda
 * @returns Array com os IDs dos lançamentos criados
 */
export async function criarLancamentosVenda(
  venda: VendaParaLancamento,
  userId: string
): Promise<string[]> {
  const contasMap = await buscarContasMap();
  const lancamentosIds: string[] = [];

  const contaEntrada = getContaEntrada(venda.formaPagamento, contasMap);
  const isConsignacao = venda.peca.origemTipo === "CONSIGNACAO";
  const valorRepasse = venda.valorRepasseDevido || 0;
  const margem = isConsignacao ? venda.valorFinal - valorRepasse : venda.valorFinal;

  // -------------------------------------------
  // 1. RECEITA
  // -------------------------------------------
  if (isConsignacao) {
    // Consignação: dois lançamentos separados
    // 1a. Receita (apenas margem)
    if (margem > 0) {
      const lancReceita = await prisma.lancamento.create({
        data: {
          data: venda.dataVenda,
          descricao: `Venda consignação ${venda.peca.sku} — receita (margem)`,
          tipo: "AUTOMATICO_VENDA",
          recorrente: true,
          vendaId: venda.id,
          userId,
          linhas: {
            create: {
              contaDebitoId: contaEntrada,
              contaCreditoId: getConta(contasMap, CONTAS.RECEITA_CONSIGNACAO),
              valor: margem,
              historico: `Receita margem ${venda.peca.sku}`,
            },
          },
        },
      });
      lancamentosIds.push(lancReceita.id);
    }

    // 1b. Passivo de repasse
    if (valorRepasse > 0) {
      const lancRepasse = await prisma.lancamento.create({
        data: {
          data: venda.dataVenda,
          descricao: `Venda consignação ${venda.peca.sku} — repasse fornecedor`,
          tipo: "AUTOMATICO_VENDA",
          recorrente: true,
          vendaId: venda.id,
          userId,
          linhas: {
            create: {
              contaDebitoId: contaEntrada,
              contaCreditoId: getConta(contasMap, CONTAS.REPASSE_CONSIGNACAO),
              valor: valorRepasse,
              historico: `Repasse consignação ${venda.peca.sku}`,
            },
          },
        },
      });
      lancamentosIds.push(lancRepasse.id);
    }
  } else {
    // Estoque próprio: receita sobre valor total
    const lancReceita = await prisma.lancamento.create({
      data: {
        data: venda.dataVenda,
        descricao: `Venda ${venda.peca.sku} — receita bruta`,
        tipo: "AUTOMATICO_VENDA",
        recorrente: true,
        vendaId: venda.id,
        userId,
        linhas: {
          create: {
            contaDebitoId: contaEntrada,
            contaCreditoId: getConta(contasMap, CONTAS.RECEITA_ESTOQUE_PROPRIO),
            valor: venda.valorFinal,
            historico: `Receita bruta ${venda.peca.sku}`,
          },
        },
      },
    });
    lancamentosIds.push(lancReceita.id);
  }

  // -------------------------------------------
  // 2. MDR (se pagamento em cartão)
  // -------------------------------------------
  if (venda.formaPagamento !== "PIX" && venda.taxaMDR > 0) {
    const valorMDR = Math.round(venda.valorFinal * (venda.taxaMDR / 100) * 100) / 100;

    if (valorMDR > 0) {
      // MDR debita na conta de dedução e credita no caixa/recebíveis (reduz a entrada)
      // Na prática: D 3.2.1 MDR (dedução receita) → C conta de entrada
      const lancMDR = await prisma.lancamento.create({
        data: {
          data: venda.dataVenda,
          descricao: `MDR ${venda.taxaMDR}% — ${venda.peca.sku}`,
          tipo: "AUTOMATICO_VENDA",
          recorrente: true,
          vendaId: venda.id,
          userId,
          linhas: {
            create: {
              contaDebitoId: getConta(contasMap, CONTAS.MDR_TAXA_CARTAO),
              contaCreditoId: contaEntrada,
              valor: valorMDR,
              historico: `MDR ${venda.taxaMDR}% sobre R$${venda.valorFinal.toFixed(2)}`,
            },
          },
        },
      });
      lancamentosIds.push(lancMDR.id);
    }
  }

  // -------------------------------------------
  // 3. SIMPLES NACIONAL
  // -------------------------------------------
  // Base de cálculo: consignação = margem, estoque próprio = valor total
  const baseSimples = isConsignacao ? margem : venda.valorFinal;

  if (baseSimples > 0) {
    const rbt12 = await calcularRBT12(venda.dataVenda);
    const { valorImposto, aliquotaEfetiva } = calcularImpostoVenda(baseSimples, rbt12);

    if (valorImposto > 0) {
      const lancSimples = await prisma.lancamento.create({
        data: {
          data: venda.dataVenda,
          descricao: `Simples Nacional ${(aliquotaEfetiva * 100).toFixed(2)}% — ${venda.peca.sku}`,
          tipo: "AUTOMATICO_VENDA",
          recorrente: true,
          vendaId: venda.id,
          userId,
          linhas: {
            create: {
              contaDebitoId: getConta(contasMap, CONTAS.SIMPLES_NACIONAL),
              contaCreditoId: getConta(contasMap, CONTAS.SIMPLES_A_RECOLHER),
              valor: valorImposto,
              historico: `Simples Nacional ${(aliquotaEfetiva * 100).toFixed(2)}% sobre R$${baseSimples.toFixed(2)} (RBT12: R$${rbt12.toFixed(2)})`,
            },
          },
        },
      });
      lancamentosIds.push(lancSimples.id);
    }
  }

  // -------------------------------------------
  // 4. CMV (apenas estoque próprio)
  // -------------------------------------------
  if (!isConsignacao) {
    const custoAquisicao = venda.peca.valorCompra;
    const custoManutencao = venda.peca.custoManutencao || 0;

    // 4a. Custo de aquisição → baixa no estoque
    if (custoAquisicao > 0) {
      const contaCMV = getContaCMV(venda.peca.origemCanal, contasMap);

      const lancCMV = await prisma.lancamento.create({
        data: {
          data: venda.dataVenda,
          descricao: `CMV aquisição — ${venda.peca.sku}`,
          tipo: "AUTOMATICO_VENDA",
          recorrente: true,
          vendaId: venda.id,
          userId,
          linhas: {
            create: {
              contaDebitoId: contaCMV,
              contaCreditoId: getConta(contasMap, CONTAS.ESTOQUE_PROPRIO),
              valor: custoAquisicao,
              historico: `Custo aquisição ${venda.peca.sku}`,
            },
          },
        },
      });
      lancamentosIds.push(lancCMV.id);
    }

    // 4b. Custo de manutenção/restauro → baixa no estoque
    if (custoManutencao > 0) {
      const lancManutencao = await prisma.lancamento.create({
        data: {
          data: venda.dataVenda,
          descricao: `CMV manutenção/restauro — ${venda.peca.sku}`,
          tipo: "AUTOMATICO_VENDA",
          recorrente: true,
          vendaId: venda.id,
          userId,
          linhas: {
            create: {
              contaDebitoId: getConta(contasMap, CONTAS.CMV_MANUTENCAO),
              contaCreditoId: getConta(contasMap, CONTAS.ESTOQUE_PROPRIO),
              valor: custoManutencao,
              historico: `Manutenção/restauro ${venda.peca.sku}`,
            },
          },
        },
      });
      lancamentosIds.push(lancManutencao.id);
    }
  }

  return lancamentosIds;
}

/**
 * Estorna (reverte) todos os lançamentos contábeis de uma venda cancelada.
 *
 * @param vendaId - ID da venda cancelada
 * @param userId - ID do usuário que está cancelando
 * @returns Número de lançamentos estornados
 */
export async function reverterLancamentosVenda(
  vendaId: string,
  userId: string
): Promise<number> {
  // Buscar todos os lançamentos "vivos" da venda (não estornados nem reversões)
  const lancamentos = await prisma.lancamento.findMany({
    where: {
      vendaId,
      estornado: false,
      estornoDeId: null,
      tipo: "AUTOMATICO_VENDA",
    },
    include: { linhas: true },
  });

  if (lancamentos.length === 0) {
    return 0;
  }

  let count = 0;

  for (const lancamento of lancamentos) {
    // Criar lançamento de estorno (invertendo débito/crédito)
    await prisma.lancamento.create({
      data: {
        data: new Date(),
        descricao: `Estorno cancelamento: ${lancamento.descricao}`,
        tipo: "AUTOMATICO_VENDA",
        recorrente: lancamento.recorrente,
        vendaId,
        estornoDeId: lancamento.id,
        userId,
        linhas: {
          create: lancamento.linhas.map((l) => ({
            contaDebitoId: l.contaCreditoId, // Invertido
            contaCreditoId: l.contaDebitoId, // Invertido
            valor: l.valor,
            historico: `Estorno: ${l.historico || ""}`,
          })),
        },
      },
    });

    // Marcar original como estornado
    await prisma.lancamento.update({
      where: { id: lancamento.id },
      data: { estornado: true },
    });

    count++;
  }

  return count;
}
