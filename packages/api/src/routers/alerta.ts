import { z } from "zod";
import { protectedProcedure, router } from "../index";
import prisma from "@gestaomrchrono/db";
import { criarAlertaEstoqueBaixo, criarAlertaRelojoeiroDemorado } from "../services/alerta.service";

export const alertaRouter = router({
  // Lista alertas nao lidos
  listNaoLidos: protectedProcedure.query(async () => {
    const alertas = await prisma.alerta.findMany({
      where: { lido: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return alertas;
  }),

  // Lista todos os alertas com paginacao
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        tipo: z.enum(["ESTOQUE_BAIXO", "RELOJOEIRO_DEMORADO", "REPASSE_PENDENTE"]).optional(),
        lido: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, tipo, lido } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(tipo && { tipo }),
        ...(lido !== undefined && { lido }),
      };

      const [alertas, total] = await Promise.all([
        prisma.alerta.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.alerta.count({ where }),
      ]);

      return {
        alertas,
        total,
        pages: Math.ceil(total / limit),
      };
    }),

  // Marcar como lido
  marcarLido: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.alerta.update({
        where: { id: input.id },
        data: { lido: true },
      });
      return { success: true };
    }),

  // Marcar todos como lidos
  marcarTodosLidos: protectedProcedure.mutation(async () => {
    await prisma.alerta.updateMany({
      where: { lido: false },
      data: { lido: true },
    });
    return { success: true };
  }),

  // Verificar e criar alertas automaticos (chamado periodicamente ou no dashboard)
  verificarAlertas: protectedProcedure.mutation(async () => {
    const alertasCriados: string[] = [];

    // 1. Verificar estoque baixo
    const configLeadTime = await prisma.configuracao.findUnique({
      where: { chave: "LEAD_TIME_DIAS" },
    });
    const configMetaSemanal = await prisma.configuracao.findUnique({
      where: { chave: "META_VENDAS_SEMANAL" },
    });

    const leadTime = configLeadTime ? parseInt(configLeadTime.valor) : 20;
    const metaSemanal = configMetaSemanal ? parseInt(configMetaSemanal.valor) : 10;
    const estoqueIdeal = Math.ceil(metaSemanal * (leadTime / 7));

    const pecasEmEstoque = await prisma.peca.count({
      where: {
        status: { in: ["DISPONIVEL", "EM_TRANSITO", "REVISAO"] },
        arquivado: false,
      },
    });

    if (pecasEmEstoque < estoqueIdeal) {
      // Verificar se ja existe alerta de estoque baixo nao lido
      const alertaExistente = await prisma.alerta.findFirst({
        where: {
          tipo: "ESTOQUE_BAIXO",
          lido: false,
        },
      });

      if (!alertaExistente) {
        await criarAlertaEstoqueBaixo(pecasEmEstoque, estoqueIdeal);
        alertasCriados.push("ESTOQUE_BAIXO");
      }
    }

    // 2. Verificar pecas no relojoeiro ha muito tempo
    const configDiasRelojoeiro = await prisma.configuracao.findUnique({
      where: { chave: "ALERTA_DIAS_RELOJOEIRO" },
    });
    const diasLimite = configDiasRelojoeiro ? parseInt(configDiasRelojoeiro.valor) : 14;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    // Buscar pecas em REVISAO com historico antigo
    const pecasEmRevisao = await prisma.peca.findMany({
      where: {
        status: "REVISAO",
        arquivado: false,
      },
      include: {
        historicoStatus: {
          where: { statusNovo: "REVISAO" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    for (const peca of pecasEmRevisao) {
      const ultimoHistorico = peca.historicoStatus[0];
      if (ultimoHistorico && ultimoHistorico.createdAt < dataLimite) {
        // Verificar se ja existe alerta para esta peca
        const alertaExistente = await prisma.alerta.findFirst({
          where: {
            tipo: "RELOJOEIRO_DEMORADO",
            entidadeId: peca.id,
            lido: false,
          },
        });

        if (!alertaExistente) {
          const diasEmRevisao = Math.floor(
            (Date.now() - ultimoHistorico.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          await criarAlertaRelojoeiroDemorado(peca.id, peca.sku, diasEmRevisao);
          alertasCriados.push(`RELOJOEIRO_DEMORADO:${peca.sku}`);
        }
      }
    }

    return { alertasCriados };
  }),

  // Contagem de alertas nao lidos (para o badge)
  countNaoLidos: protectedProcedure.query(async () => {
    const count = await prisma.alerta.count({
      where: { lido: false },
    });
    return { count };
  }),
});
