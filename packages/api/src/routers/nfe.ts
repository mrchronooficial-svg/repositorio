import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";
import { calcularValorDeclararAutomatico } from "../utils/valor-declarar";

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
            valorDeclararManual: true,
            nfeDeclarada: true,
            dataVenda: true,
            valorFinal: true,
            valorRepasseDevido: true,
            peca: {
              select: {
                sku: true,
                marca: true,
                modelo: true,
                origemTipo: true,
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

  // Definir o valor a declarar manualmente.
  // Marca a venda como manual para que as rotinas automaticas (editar venda e
  // "Sincronizar lancamentos") deixem de sobrescrever esse valor.
  definirValorDeclarar: protectedProcedure
    .input(
      z.object({
        vendaId: z.string().cuid(),
        valor: z.number().nonnegative("Valor nao pode ser negativo").max(9_999_999.99),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        select: {
          valorDeclarar: true,
          cancelada: true,
          peca: { select: { sku: true } },
        },
      });

      if (!venda) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Venda nao encontrada" });
      }
      if (venda.cancelada) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nao e possivel alterar o valor a declarar de uma venda cancelada",
        });
      }

      const valor = Math.round(input.valor * 100) / 100;

      await prisma.venda.update({
        where: { id: input.vendaId },
        data: { valorDeclarar: valor, valorDeclararManual: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR_VALOR_DECLARAR",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: {
          peca: venda.peca.sku,
          valorAnterior: venda.valorDeclarar ? Number(venda.valorDeclarar) : null,
          valorNovo: valor,
        },
      });

      return { success: true, valorDeclarar: valor };
    }),

  // Voltar ao valor calculado automaticamente pela regra padrao
  voltarValorAutomatico: protectedProcedure
    .input(z.object({ vendaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        select: {
          valorDeclarar: true,
          valorFinal: true,
          valorRepasseDevido: true,
          cancelada: true,
          peca: { select: { sku: true, origemTipo: true } },
        },
      });

      if (!venda) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Venda nao encontrada" });
      }
      if (venda.cancelada) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nao e possivel alterar o valor a declarar de uma venda cancelada",
        });
      }

      const valor = calcularValorDeclararAutomatico({
        valorFinal: Number(venda.valorFinal),
        valorRepasseDevido: venda.valorRepasseDevido
          ? Number(venda.valorRepasseDevido)
          : null,
        origemTipo: venda.peca.origemTipo,
      });

      await prisma.venda.update({
        where: { id: input.vendaId },
        data: { valorDeclarar: valor, valorDeclararManual: false },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "RESTAURAR_VALOR_DECLARAR",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: {
          peca: venda.peca.sku,
          valorAnterior: venda.valorDeclarar ? Number(venda.valorDeclarar) : null,
          valorNovo: valor,
        },
      });

      return { success: true, valorDeclarar: valor };
    }),
});
