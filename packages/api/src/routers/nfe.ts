import { z } from "zod";
import { router, protectedProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";

const NfeListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["DECLARADA", "NAO_DECLARADA"]).optional(),
});

export const nfeRouter = router({
  // Listar vendas para controle de NFe
  list: protectedProcedure
    .input(NfeListSchema)
    .query(async ({ input }) => {
      const { page, limit, search, status } = input;
      const skip = (page - 1) * limit;

      const where = {
        cancelada: false,
        ...(status === "DECLARADA" && { nfeDeclarada: true }),
        ...(status === "NAO_DECLARADA" && { nfeDeclarada: false }),
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
          select: {
            id: true,
            valorDeclarar: true,
            nfeDeclarada: true,
            dataVenda: true,
            peca: {
              select: {
                sku: true,
                marca: true,
                modelo: true,
                fotos: { take: 1, select: { url: true } },
                fornecedor: { select: { nome: true } },
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

  // Metricas de NFe
  getMetricas: protectedProcedure.query(async () => {
    const [pendentes, declaradas, somaPendente] = await Promise.all([
      prisma.venda.count({
        where: { cancelada: false, nfeDeclarada: false },
      }),
      prisma.venda.count({
        where: { cancelada: false, nfeDeclarada: true },
      }),
      prisma.venda.aggregate({
        where: { cancelada: false, nfeDeclarada: false },
        _sum: { valorDeclarar: true },
      }),
    ]);

    return {
      pendentes,
      declaradas,
      valorPendente: Number(somaPendente._sum.valorDeclarar || 0),
    };
  }),

  // Marcar como declarada
  marcarDeclarada: protectedProcedure
    .input(z.object({ vendaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.venda.update({
        where: { id: input.vendaId },
        data: { nfeDeclarada: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "MARCAR_NFE_DECLARADA",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: {},
      });

      return { success: true };
    }),

  // Desmarcar como declarada
  desmarcarDeclarada: protectedProcedure
    .input(z.object({ vendaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.venda.update({
        where: { id: input.vendaId },
        data: { nfeDeclarada: false },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "DESMARCAR_NFE_DECLARADA",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: {},
      });

      return { success: true };
    }),
});
