import { z } from "zod";
import { router, protectedProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";

const LogisticaListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  statusEnvio: z.enum(["PENDENTE", "ENVIADO"]).optional(),
});

export const logisticaRouter = router({
  // Listar vendas para logistica
  list: protectedProcedure
    .input(LogisticaListSchema)
    .query(async ({ input }) => {
      const { page, limit, search, statusEnvio } = input;
      const skip = (page - 1) * limit;

      const where = {
        cancelada: false,
        ...(statusEnvio && { statusEnvio }),
        ...(search && {
          OR: [
            { peca: { sku: { contains: search, mode: "insensitive" as const } } },
            { cliente: { nome: { contains: search, mode: "insensitive" as const } } },
          ],
        }),
      };

      const [vendas, total] = await Promise.all([
        prisma.venda.findMany({
          where,
          skip,
          take: limit,
          orderBy: { dataVenda: "desc" },
          include: {
            peca: {
              select: {
                sku: true,
                marca: true,
                modelo: true,
                localizacao: true,
                fotos: { take: 1, select: { url: true } },
              },
            },
            cliente: {
              select: { nome: true },
            },
          },
        }),
        prisma.venda.count({ where }),
      ]);

      return {
        vendas,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Marcar como enviado
  marcarEnviado: protectedProcedure
    .input(z.object({ vendaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        include: { peca: { select: { sku: true } } },
      });

      if (!venda) {
        throw new Error("Venda nao encontrada");
      }

      if (venda.statusEnvio === "ENVIADO") {
        throw new Error("Venda ja foi marcada como enviada");
      }

      await prisma.venda.update({
        where: { id: input.vendaId },
        data: {
          statusEnvio: "ENVIADO",
          dataEnvio: new Date(),
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "MARCAR_ENVIADO",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: { sku: venda.peca.sku },
      });

      return { success: true };
    }),

  // Desfazer envio (voltar para pendente)
  desfazerEnvio: protectedProcedure
    .input(z.object({ vendaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        include: { peca: { select: { sku: true } } },
      });

      if (!venda) {
        throw new Error("Venda nao encontrada");
      }

      await prisma.venda.update({
        where: { id: input.vendaId },
        data: {
          statusEnvio: "PENDENTE",
          dataEnvio: null,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "DESFAZER_ENVIO",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: { sku: venda.peca.sku },
      });

      return { success: true };
    }),

  // Atualizar observacao
  atualizarObservacao: protectedProcedure
    .input(z.object({
      vendaId: z.string().cuid(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await prisma.venda.update({
        where: { id: input.vendaId },
        data: {
          observacaoLogistica: input.observacao || null,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ATUALIZAR_OBS_LOGISTICA",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: {},
      });

      return { success: true };
    }),

  // Metricas de logistica
  getMetricas: protectedProcedure.query(async () => {
    const [pendentes, enviadosHoje] = await Promise.all([
      prisma.venda.count({
        where: {
          cancelada: false,
          statusEnvio: "PENDENTE",
        },
      }),
      prisma.venda.count({
        where: {
          cancelada: false,
          statusEnvio: "ENVIADO",
          dataEnvio: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      pendentes,
      enviadosHoje,
    };
  }),

  // Alertas de envio pendente
  getAlertasEnvio: protectedProcedure.query(async () => {
    // Buscar configuracao de dias para alerta
    const configDias = await prisma.configuracao.findUnique({
      where: { chave: "dias_alerta_envio" },
    });
    const diasAlerta = parseInt(configDias?.valor || "3");

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasAlerta);

    const vendasAtrasadas = await prisma.venda.findMany({
      where: {
        cancelada: false,
        statusEnvio: "PENDENTE",
        dataVenda: { lt: dataLimite },
      },
      include: {
        peca: {
          select: { sku: true, marca: true, modelo: true },
        },
        cliente: {
          select: { nome: true },
        },
      },
      orderBy: { dataVenda: "asc" },
    });

    return {
      diasAlerta,
      vendasAtrasadas,
    };
  }),
});
