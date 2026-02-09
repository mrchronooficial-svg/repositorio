// Função hash determinística para gerar números consistentes
function hashSeed(pecaId: string, tipo: string): number {
  const dateKey = new Date().toISOString().slice(0, 13); // muda a cada hora
  const str = `${pecaId}-${tipo}-${dateKey}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function gerarNumeroUrgencia(
  pecaId: string,
  tipo: "viewers" | "vendidos" | "interacoes",
  min: number,
  max: number,
): number {
  const seed = hashSeed(pecaId, tipo);
  return min + (seed % (max - min + 1));
}

export function getFaixaPreco(valor: number): "baixo" | "medio" | "alto" {
  if (valor < 5000) return "baixo";
  if (valor <= 15000) return "medio";
  return "alto";
}

// Gera o número de viewers para o header (global, não por peça)
export function gerarViewersHeader(min: number, max: number): number {
  const dateKey = new Date().toISOString().slice(0, 14); // muda a cada hora (incluindo minuto dezena)
  const str = `header-viewers-${dateKey}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return min + (Math.abs(hash) % (max - min + 1));
}
