import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, socioOuAdminProcedure, adminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";
import { gerarProximoSKU, gerarSKUDevolucao } from "../services/sku.service";

// Schemas de validacao
const PecaCreateSchema = z.object({
  marca: z.string().min(1, "Marca e obrigatoria"),
  modelo: z.string().min(1, "Modelo e obrigatorio"),
  ano: z.number().int().optional(),
  tamanhoCaixa: z.number().positive("Tamanho deve ser positivo"),
  materialCaixa: z.string().optional(),
  materialPulseira: z.string().optional(),
  valorCompra: z.number().positive("Valor de compra deve ser positivo"),
  valorEstimadoVenda: z.number().positive("Valor estimado deve ser positivo"),
  origemTipo: z.enum(["COMPRA", "CONSIGNACAO"]),
  origemCanal: z.enum(["PESSOA_FISICA", "LEILAO_BRASIL", "EBAY"]).optional(),
  valorRepasse: z.number().positive().optional(), // Obrigatorio se consignacao
  localizacao: z.string().default("Fornecedor"),
  fornecedorId: z.string().cuid("Fornecedor invalido"),
  fotos: z.array(z.string().url()).min(1, "Minimo 1 foto obrigatoria"),
});

const PecaUpdateSchema = z.object({
  id: z.string().cuid(),
  marca: z.string().min(1).optional(),
  modelo: z.string().min(1).optional(),
  ano: z.number().int().optional().nullable(),
  tamanhoCaixa: z.number().positive().optional(),
  materialCaixa: z.string().optional().nullable(),
  materialPulseira: z.string().optional().nullable(),
  valorCompra: z.number().positive().optional(),
  valorEstimadoVenda: z.number().positive().optional(),
  valorRepasse: z.number().positive().optional().nullable(),
  localizacao: z.string().optional(),
});

const PecaListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["DISPONIVEL", "EM_TRANSITO", "REVISAO", "VENDIDA", "DEFEITO", "PERDA"]).optional(),
  localizacao: z.string().optional(),
  origemTipo: z.enum(["COMPRA", "CONSIGNACAO"]).optional(),
  arquivado: z.boolean().default(false),
});

const StatusUpdateSchema = z.object({
  pecaId: z.string().cuid(),
  status: z.enum(["DISPONIVEL", "EM_TRANSITO", "REVISAO", "VENDIDA", "DEFEITO", "PERDA"]),
  localizacao: z.string().optional(),
});

export const pecaRouter = router({
  // Listar pecas
  list: protectedProcedure
    .input(PecaListSchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, search, status, localizacao, origemTipo, arquivado } = input;
      const skip = (page - 1) * limit;

      const where = {
        arquivado,
        ...(status && { status }),
        ...(localizacao && { localizacao }),
        ...(origemTipo && { origemTipo }),
        ...(search && {
          OR: [
            { sku: { contains: search, mode: "insensitive" as const } },
            { marca: { contains: search, mode: "insensitive" as const } },
            { modelo: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

      const [pecas, total] = await Promise.all([
        prisma.peca.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            fotos: {
              take: 1,
              orderBy: { ordem: "asc" },
            },
            fornecedor: {
              select: { nome: true },
            },
          },
        }),
        prisma.peca.count({ where }),
      ]);

      // Ocultar valores se for funcionario
      const pecasFormatadas = pecas.map((peca) => ({
        ...peca,
        valorCompra: podeVerValores ? peca.valorCompra : null,
        valorEstimadoVenda: podeVerValores ? peca.valorEstimadoVenda : null,
        valorRepasse: podeVerValores ? peca.valorRepasse : null,
      }));

      return {
        pecas: pecasFormatadas,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Buscar por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const peca = await prisma.peca.findUnique({
        where: { id: input.id },
        include: {
          fotos: { orderBy: { ordem: "asc" } },
          fornecedor: true,
          historicoStatus: {
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { name: true } },
            },
          },
          venda: {
            include: {
              cliente: { select: { nome: true } },
            },
          },
        },
      });

      if (!peca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Peca nao encontrada",
        });
      }

      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

      return {
        ...peca,
        valorCompra: podeVerValores ? peca.valorCompra : null,
        valorEstimadoVenda: podeVerValores ? peca.valorEstimadoVenda : null,
        valorRepasse: podeVerValores ? peca.valorRepasse : null,
      };
    }),

  // Buscar por SKU
  getBySku: protectedProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ input }) => {
      const peca = await prisma.peca.findUnique({
        where: { sku: input.sku },
        select: { id: true, sku: true, marca: true, modelo: true, status: true },
      });
      return peca;
    }),

  // Criar peca
  create: protectedProcedure
    .input(PecaCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // Validar consignacao
      if (input.origemTipo === "CONSIGNACAO" && !input.valorRepasse) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Valor de repasse e obrigatorio para consignacao",
        });
      }

      // Verificar se fornecedor existe
      const fornecedor = await prisma.fornecedor.findUnique({
        where: { id: input.fornecedorId },
      });

      if (!fornecedor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fornecedor nao encontrado",
        });
      }

      // Gerar SKU
      const sku = await gerarProximoSKU();

      // Criar peca com fotos
      const peca = await prisma.peca.create({
        data: {
          sku,
          skuBase: sku,
          marca: input.marca,
          modelo: input.modelo,
          ano: input.ano,
          tamanhoCaixa: input.tamanhoCaixa,
          materialCaixa: input.materialCaixa,
          materialPulseira: input.materialPulseira,
          valorCompra: input.valorCompra,
          valorEstimadoVenda: input.valorEstimadoVenda,
          origemTipo: input.origemTipo,
          origemCanal: input.origemCanal,
          valorRepasse: input.valorRepasse,
          localizacao: input.localizacao,
          status: "EM_TRANSITO",
          fornecedorId: input.fornecedorId,
          fotos: {
            create: input.fotos.map((url, index) => ({
              url,
              ordem: index,
            })),
          },
          historicoStatus: {
            create: {
              statusNovo: "EM_TRANSITO",
              localizacaoNova: input.localizacao,
              userId: ctx.user.id,
            },
          },
        },
        include: {
          fotos: true,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "PECA",
        entidadeId: peca.id,
        detalhes: { sku: peca.sku, marca: peca.marca, modelo: peca.modelo },
      });

      return peca;
    }),

  // Atualizar peca
  update: protectedProcedure
    .input(PecaUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const peca = await prisma.peca.update({
        where: { id },
        data,
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "PECA",
        entidadeId: peca.id,
      });

      return peca;
    }),

  // Atualizar fotos
  updateFotos: protectedProcedure
    .input(z.object({
      pecaId: z.string().cuid(),
      fotos: z.array(z.string().url()).min(1, "Minimo 1 foto obrigatoria"),
    }))
    .mutation(async ({ input, ctx }) => {
      // Deletar fotos existentes e criar novas
      await prisma.foto.deleteMany({
        where: { pecaId: input.pecaId },
      });

      await prisma.foto.createMany({
        data: input.fotos.map((url, index) => ({
          url,
          ordem: index,
          pecaId: input.pecaId,
        })),
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ATUALIZAR_FOTOS",
        entidade: "PECA",
        entidadeId: input.pecaId,
      });

      return { success: true };
    }),

  // Atualizar status
  updateStatus: protectedProcedure
    .input(StatusUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const peca = await prisma.peca.findUnique({
        where: { id: input.pecaId },
        select: { status: true, localizacao: true },
      });

      if (!peca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Peca nao encontrada",
        });
      }

      // Atualizar peca e criar historico
      const pecaAtualizada = await prisma.peca.update({
        where: { id: input.pecaId },
        data: {
          status: input.status,
          localizacao: input.localizacao || peca.localizacao,
          historicoStatus: {
            create: {
              statusAnterior: peca.status,
              statusNovo: input.status,
              localizacaoAnterior: peca.localizacao,
              localizacaoNova: input.localizacao || peca.localizacao,
              userId: ctx.user.id,
            },
          },
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "MUDAR_STATUS",
        entidade: "PECA",
        entidadeId: input.pecaId,
        detalhes: {
          statusAnterior: peca.status,
          statusNovo: input.status,
        },
      });

      return pecaAtualizada;
    }),

  // Arquivar peca
  archive: socioOuAdminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const peca = await prisma.peca.update({
        where: { id: input.id },
        data: { arquivado: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ARQUIVAR",
        entidade: "PECA",
        entidadeId: peca.id,
      });

      return peca;
    }),

  // Restaurar peca
  restore: socioOuAdminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const peca = await prisma.peca.update({
        where: { id: input.id },
        data: { arquivado: false },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "RESTAURAR",
        entidade: "PECA",
        entidadeId: peca.id,
      });

      return peca;
    }),

  // Excluir peca
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verificar se tem venda vinculada
      const venda = await prisma.venda.findUnique({
        where: { pecaId: input.id },
      });

      if (venda) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Nao e possivel excluir peca com venda vinculada",
        });
      }

      await prisma.peca.delete({
        where: { id: input.id },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EXCLUIR",
        entidade: "PECA",
        entidadeId: input.id,
      });

      return { success: true };
    }),

  // Obter historico
  getHistorico: protectedProcedure
    .input(z.object({ pecaId: z.string().cuid() }))
    .query(async ({ input }) => {
      const historico = await prisma.historicoStatus.findMany({
        where: { pecaId: input.pecaId },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
        },
      });

      return historico;
    }),

  // Obter localizacoes disponiveis
  getLocalizacoes: protectedProcedure.query(async () => {
    // Buscar da configuracao
    const config = await prisma.configuracao.findUnique({
      where: { chave: "localizacoes" },
    });

    if (config?.valor) {
      return config.valor.split(",").map((loc) => loc.trim());
    }

    // Padrao
    return [
      "Rafael",
      "Pedro",
      "Heitor",
      "Tampograth",
      "Fornecedor",
      "Cliente Final",
    ];
  }),

  // Metricas do estoque
  getMetricas: protectedProcedure.query(async ({ ctx }) => {
    const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

    // Contagem por status
    const contagens = await prisma.peca.groupBy({
      by: ["status"],
      where: { arquivado: false },
      _count: true,
    });

    const statusCount: Record<string, number> = {};
    contagens.forEach((c) => {
      statusCount[c.status] = c._count;
    });

    // Total em estoque (status que contam)
    const emEstoque = (statusCount["DISPONIVEL"] || 0) +
      (statusCount["EM_TRANSITO"] || 0) +
      (statusCount["REVISAO"] || 0);

    // Buscar configuracoes para estoque ideal
    const configs = await prisma.configuracao.findMany({
      where: {
        chave: { in: ["meta_vendas_semana", "lead_time_dias"] },
      },
    });

    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.chave] = c.valor;
    });

    const metaSemanal = parseInt(configMap["meta_vendas_semana"] || "10", 10);
    const leadTime = parseInt(configMap["lead_time_dias"] || "20", 10);
    const estoqueIdeal = Math.ceil(metaSemanal * (leadTime / 7));

    // Valor total em estoque (se puder ver)
    let valorTotalEstoque = null;
    if (podeVerValores) {
      const pecasEmEstoque = await prisma.peca.findMany({
        where: {
          arquivado: false,
          status: { in: ["DISPONIVEL", "EM_TRANSITO", "REVISAO"] },
        },
        select: { valorEstimadoVenda: true },
      });

      valorTotalEstoque = pecasEmEstoque.reduce(
        (acc, p) => acc + Number(p.valorEstimadoVenda),
        0
      );
    }

    return {
      statusCount,
      emEstoque,
      estoqueIdeal,
      diferenca: emEstoque - estoqueIdeal,
      valorTotalEstoque,
    };
  }),
});
