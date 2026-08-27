// Valor a declarar (NFe) de uma venda — fonte unica de verdade.
//
// COMPRA/ENCOMENDA: valor a declarar = valor final da venda
// CONSIGNACAO:      valor a declarar = margem (valorFinal - repasse), que e o
//                   que efetivamente entra na conta da Mr. Chrono
//
// Este e o valor AUTOMATICO. Vendas com `valorDeclararManual = true` tem o
// valor definido a mao e nao devem ser recalculadas — ver nfe router.

export function calcularValorDeclararAutomatico(params: {
  valorFinal: number;
  valorRepasseDevido: number | null;
  origemTipo: string;
}): number {
  const repasse = params.valorRepasseDevido || 0;
  const isConsignacao = params.origemTipo === "CONSIGNACAO" && repasse > 0;
  const valor = isConsignacao ? params.valorFinal - repasse : params.valorFinal;
  return Math.round(valor * 100) / 100;
}
