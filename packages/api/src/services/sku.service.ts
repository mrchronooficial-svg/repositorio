import prisma from "@gestaomrchrono/db";

/**
 * Gera o proximo SKU sequencial
 * Formato: MRC-0001, MRC-0002, etc.
 * Busca o maior numero entre os skuBase existentes (incluindo devolucoes) para evitar duplicatas.
 * A comparacao e numerica e ignora SKUs fora do padrao (ex: MRC-TESTE), que nao entram na sequencia.
 */
export async function gerarProximoSKU(): Promise<string> {
  const pecas = await prisma.peca.findMany({
    where: {
      skuBase: { startsWith: "MRC-" },
    },
    distinct: ["skuBase"],
    select: { skuBase: true },
  });

  const maiorNumero = pecas.reduce((maior, peca) => {
    const match = peca.skuBase.match(/^MRC-(\d+)$/);
    return match?.[1] ? Math.max(maior, parseInt(match[1], 10)) : maior;
  }, 0);

  return `MRC-${(maiorNumero + 1).toString().padStart(4, "0")}`;
}

/**
 * Gera SKU derivado para devolucao
 * Formato: MRC-0001-1, MRC-0001-2, etc.
 */
export async function gerarSKUDevolucao(skuBase: string): Promise<string> {
  // Contar devolucoes existentes
  const devolucoes = await prisma.peca.count({
    where: {
      skuBase,
      sku: { not: skuBase },
    },
  });

  const sufixo = devolucoes + 1;
  return `${skuBase}-${sufixo}`;
}
