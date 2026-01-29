import { z } from "zod";
import { protectedProcedure, router } from "../index";
import prisma from "@gestaomrchrono/db";

// Verificar se usuario e admin
function assertAdmin(nivel: string) {
  if (nivel !== "ADMINISTRADOR") {
    throw new Error("Acesso negado. Apenas administradores podem acessar esta funcao.");
  }
}

const ACOES = [
  "CRIAR",
  "EDITAR",
  "EXCLUIR",
  "ARQUIVAR",
  "RESTAURAR",
  "DESATIVAR",
  "REATIVAR",
  "RESETAR_SENHA",
  "ALTERAR_STATUS",
  "REGISTRAR_PAGAMENTO",
  "REGISTRAR_REPASSE",
  "CANCELAR_VENDA",
] as const;

const ENTIDADES = [
  "PECA",
  "VENDA",
  "CLIENTE",
  "FORNECEDOR",
  "USUARIO",
  "CONFIGURACAO",
] as const;

export const auditoriaRouter = router({
  // Listar logs de auditoria
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        userId: z.string().optional(),
        acao: z.enum(ACOES).optional(),
        entidade: z.enum(ENTIDADES).optional(),
        entidadeId: z.string().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const { page, limit, userId, acao, entidade, entidadeId, dataInicio, dataFim } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(userId && { userId }),
        ...(acao && { acao }),
        ...(entidade && { entidade }),
        ...(entidadeId && { entidadeId }),
        ...(dataInicio && {
          createdAt: {
            gte: new Date(dataInicio),
            ...(dataFim && { lte: new Date(dataFim + "T23:59:59") }),
          },
        }),
        ...(!dataInicio && dataFim && {
          createdAt: { lte: new Date(dataFim + "T23:59:59") },
        }),
      };

      const [logs, total] = await Promise.all([
        prisma.auditoria.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.auditoria.count({ where }),
      ]);

      return {
        logs,
        total,
        pages: Math.ceil(total / limit),
      };
    }),

  // Buscar log especifico
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const log = await prisma.auditoria.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!log) {
        throw new Error("Log nao encontrado");
      }

      return log;
    }),

  // Buscar logs de uma entidade especifica
  getByEntidade: protectedProcedure
    .input(
      z.object({
        entidade: z.enum(ENTIDADES),
        entidadeId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const logs = await prisma.auditoria.findMany({
        where: {
          entidade: input.entidade,
          entidadeId: input.entidadeId,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return logs;
    }),

  // Buscar logs de um usuario especifico
  getByUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const { userId, page, limit } = input;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditoria.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.auditoria.count({ where: { userId } }),
      ]);

      return {
        logs,
        total,
        pages: Math.ceil(total / limit),
      };
    }),

  // Estatisticas de auditoria
  getStats: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx.session.user.nivel);

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());

    const [
      totalLogs,
      logsMes,
      logsSemana,
      logsHoje,
      topUsuarios,
      topAcoes,
    ] = await Promise.all([
      prisma.auditoria.count(),
      prisma.auditoria.count({
        where: { createdAt: { gte: inicioMes } },
      }),
      prisma.auditoria.count({
        where: { createdAt: { gte: inicioSemana } },
      }),
      prisma.auditoria.count({
        where: {
          createdAt: {
            gte: new Date(hoje.toISOString().split("T")[0]),
          },
        },
      }),
      prisma.auditoria.groupBy({
        by: ["userId"],
        _count: true,
        orderBy: { _count: { userId: "desc" } },
        take: 5,
      }),
      prisma.auditoria.groupBy({
        by: ["acao"],
        _count: true,
        orderBy: { _count: { acao: "desc" } },
        take: 5,
      }),
    ]);

    // Buscar nomes dos top usuarios
    const userIds = topUsuarios.map((u) => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const topUsuariosComNome = topUsuarios.map((u) => ({
      userId: u.userId,
      count: u._count,
      userName: users.find((user) => user.id === u.userId)?.name || "Desconhecido",
    }));

    return {
      total: totalLogs,
      mes: logsMes,
      semana: logsSemana,
      hoje: logsHoje,
      topUsuarios: topUsuariosComNome,
      topAcoes: topAcoes.map((a) => ({ acao: a.acao, count: a._count })),
    };
  }),

  // Exportar logs (retorna dados para download)
  export: protectedProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
        entidade: z.enum(ENTIDADES).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const logs = await prisma.auditoria.findMany({
        where: {
          createdAt: {
            gte: new Date(input.dataInicio),
            lte: new Date(input.dataFim + "T23:59:59"),
          },
          ...(input.entidade && { entidade: input.entidade }),
        },
        orderBy: { createdAt: "desc" },
        take: 10000, // Limite maximo de exportacao
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return logs.map((log) => ({
        data: log.createdAt.toISOString(),
        usuario: log.user.name,
        email: log.user.email,
        acao: log.acao,
        entidade: log.entidade,
        entidadeId: log.entidadeId || "",
        detalhes: log.detalhes || "",
      }));
    }),
});
