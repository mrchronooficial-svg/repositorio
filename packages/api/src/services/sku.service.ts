import prisma from "@gestaomrchrono/db";

/**
 * Gera o proximo SKU sequencial
 * Formato: MRC-0001, MRC-0002, etc.
 */
export async function gerarProximoSKU(): Promise<string> {
  // Buscar ultimo SKU base (sem sufixo de devolucao)
  const ultimaPeca = await prisma.peca.findFirst({
    where: {
      numeroDevolucoes: 0,
    },
    orderBy: { createdAt: "desc" },
    select: { skuBase: true },
  });

  let proximoNumero = 1;

  if (ultimaPeca?.skuBase) {
    const match = ultimaPeca.skuBase.match(/MRC-(\d+)/);
    if (match && match[1]) {
      proximoNumero = parseInt(match[1], 10) + 1;
    }
  }

  const sku = `MRC-${proximoNumero.toString().padStart(4, "0")}`;
  return sku;
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
