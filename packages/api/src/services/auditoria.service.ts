import prisma from "@gestaomrchrono/db";

interface RegistrarAuditoriaParams {
  userId: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  detalhes?: Record<string, unknown>;
}

export async function registrarAuditoria({
  userId,
  acao,
  entidade,
  entidadeId,
  detalhes,
}: RegistrarAuditoriaParams): Promise<void> {
  await prisma.auditoria.create({
    data: {
      userId,
      acao,
      entidade,
      entidadeId,
      detalhes: detalhes ? JSON.stringify(detalhes) : null,
    },
  });
}
