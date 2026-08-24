/**
 * Origem das peças.
 *
 * COMPRA e ENCOMENDA são peças PRÓPRIAS: a Mr. Chrono paga o fornecedor, o
 * relógio entra no ativo (estoque) e o custo vira CMV na venda. A diferença é
 * só comercial — a encomenda já tem comprador definido na aquisição.
 *
 * CONSIGNACAO não é peça própria: não há valor de compra, e o acerto com o
 * fornecedor é um repasse sobre a venda.
 *
 * Por isso, todo KPI/relatório de estoque próprio deve usar ORIGENS_PROPRIAS
 * em vez de comparar com "COMPRA" direto.
 */
export const ORIGENS_PROPRIAS = ["COMPRA", "ENCOMENDA"] as const;

export type OrigemTipoValor = "COMPRA" | "CONSIGNACAO" | "ENCOMENDA";

/** Filtro Prisma para peças próprias (compradas ou encomendadas). */
export const filtroOrigemPropria = { in: [...ORIGENS_PROPRIAS] };

export function isOrigemPropria(origemTipo: string): boolean {
  return origemTipo !== "CONSIGNACAO";
}
