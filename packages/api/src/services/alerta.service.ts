import prisma from "@gestaomrchrono/db";

type TipoAlerta = "ESTOQUE_BAIXO" | "RELOJOEIRO_DEMORADO" | "REPASSE_PENDENTE";

interface CriarAlertaParams {
  tipo: TipoAlerta;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
}

export async function criarAlerta(params: CriarAlertaParams): Promise<void> {
  await prisma.alerta.create({
    data: params,
  });
}

export async function criarAlertaRepassePendente(
  vendaId: string,
  fornecedorNome: string,
  valor: number
): Promise<void> {
  await criarAlerta({
    tipo: "REPASSE_PENDENTE",
    titulo: "Repasse Pendente",
    mensagem: `Venda registrada. Repasse de R$ ${valor.toFixed(2)} pendente para ${fornecedorNome}.`,
    entidade: "VENDA",
    entidadeId: vendaId,
  });
}

export async function criarAlertaEstoqueBaixo(
  emEstoque: number,
  estoqueIdeal: number
): Promise<void> {
  await criarAlerta({
    tipo: "ESTOQUE_BAIXO",
    titulo: "Estoque Abaixo do Ideal",
    mensagem: `Estoque atual: ${emEstoque} pecas. Ideal: ${estoqueIdeal} pecas.`,
  });
}

export async function criarAlertaRelojoeiroDemorado(
  pecaId: string,
  sku: string,
  dias: number
): Promise<void> {
  await criarAlerta({
    tipo: "RELOJOEIRO_DEMORADO",
    titulo: "Peca no Relojoeiro",
    mensagem: `Peca ${sku} esta em revisao ha ${dias} dias.`,
    entidade: "PECA",
    entidadeId: pecaId,
  });
}

export async function marcarAlertaComoLido(alertaId: string): Promise<void> {
  await prisma.alerta.update({
    where: { id: alertaId },
    data: { lido: true },
  });
}

export async function getAlertasNaoLidos() {
  return prisma.alerta.findMany({
    where: { lido: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
