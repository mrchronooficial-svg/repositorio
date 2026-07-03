// Utilitarios de calculo de pagamento de vendas.
//
// Valores monetarios sao Decimal(10,2) no banco, mas ao converter para Number
// e somar varios pagamentos surgem erros de ponto flutuante (ex.: 2589.99 - 2589.98
// = 0.010000000000218...). Isso causava dois problemas:
//   1. Vendas quitadas ficavam presas em PARCIAL (saldo "0.00" que nunca virava PAGO),
//      sumindo do fluxo mas impossiveis de quitar.
//   2. Vendas parcialmente pagas cujo valorFinal era alterado depois NAO tinham o
//      status recalculado, ficando PAGO com saldo devedor real -> nao entravam em
//      "a receber".
//
// Centralizamos aqui o arredondamento para centavos e a regra de status para que
// TODOS os caminhos de escrita (criar venda, registrar/editar/deletar pagamento,
// editar venda) usem exatamente a mesma logica.

// Tolerancia de meio centavo: absorve ruido de ponto flutuante sem mascarar
// dividas reais (o menor saldo real possivel e R$ 0,01).
export const EPSILON_CENTAVO = 0.005;

/** Arredonda um valor monetario para 2 casas decimais (centavos). */
export function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Saldo devedor arredondado para centavos (valorFinal - totalPago). */
export function calcularSaldoDevedor(valorFinal: number, totalPago: number): number {
  return arredondar2(valorFinal - totalPago);
}

/** Determina o status de pagamento a partir do valor final e do total pago. */
export function calcularStatusPagamento(
  valorFinal: number,
  totalPago: number
): "PAGO" | "PARCIAL" | "NAO_PAGO" {
  const saldo = calcularSaldoDevedor(valorFinal, totalPago);
  if (saldo <= EPSILON_CENTAVO) return "PAGO";
  if (arredondar2(totalPago) > EPSILON_CENTAVO) return "PARCIAL";
  return "NAO_PAGO";
}
