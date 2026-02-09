export function calcularPrecoParcelado(valorAVista: number): {
  valorParcela: number;
  valorTotal: number;
  numeroParcelas: number;
} {
  const valorComJuros = valorAVista * 1.15;
  const valorParcela = valorComJuros / 12;
  return {
    valorParcela: Math.round(valorParcela * 100) / 100,
    valorTotal: Math.round(valorComJuros * 100) / 100,
    numeroParcelas: 12,
  };
}

export function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
