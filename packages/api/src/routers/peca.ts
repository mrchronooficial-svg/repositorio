import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, socioOuAdminProcedure, adminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";
import { gerarProximoSKU } from "../services/sku.service";
import { carregarImpostoConfig, calcularLucroBrutoEstoque } from "../utils/lucro-bruto";
import { filtroOrigemPropria, isOrigemPropria } from "../utils/origem";

// Schemas de validacao
const PecaCreateSchema = z.object({
  marca: z.string().min(1, "Marca e obrigatoria"),
  modelo: z.string().min(1, "Modelo e obrigatorio"),
  ano: z.number().int().optional(),
  tamanhoCaixa: z.number().positive("Tamanho deve ser positivo"),
  materialCaixa: z.string().optional(),
  materialPulseira: z.string().optional(),
  movimento: z.string().optional(),
  referencia: z.string().optional(),
  calibre: z.string().optional(),
  // Valor de compra: positivo para COMPRA, zero permitido para CONSIGNACAO
  valorCompra: z.number().nonnegative("Valor de compra nao pode ser negativo"),
  valorEstimadoVenda: z.number().positive("Valor estimado deve ser positivo"),
  origemTipo: z.enum(["COMPRA", "CONSIGNACAO", "ENCOMENDA"]),
  origemCanal: z.enum(["PESSOA_FISICA", "LEILAO_BRASIL", "EBAY"]).optional(),
  valorRepasse: z.number().positive().optional(), // Valor fixo de repasse (consignacao)
  percentualRepasse: z.number().positive().max(100).optional(), // Percentual do valor final (consignacao)
  localizacao: z.string().default("Fornecedor"),
  fornecedorId: z.string().cuid("Fornecedor invalido"),
  revisada: z.boolean().optional(),
  dataEstimadaChegada: z.string().optional(), // ISO date (yyyy-mm-dd) — obrigatória para COMPRA/ENCOMENDA
  fotos: z.array(z.string().min(1)).min(1, "Minimo 1 foto obrigatoria"),
}).refine(
  (data) => {
    // Peca propria (COMPRA ou ENCOMENDA): valor de compra deve ser positivo
    if (isOrigemPropria(data.origemTipo) && data.valorCompra <= 0) {
      return false;
    }
    return true;
  },
  {
    message: "Valor de compra deve ser positivo para compras e encomendas",
    path: ["valorCompra"],
  }
).refine(
  (data) => {
    // Data estimada de chegada e obrigatoria para peças compradas/encomendadas
    if (isOrigemPropria(data.origemTipo) && !data.dataEstimadaChegada) {
      return false;
    }
    return true;
  },
  {
    message: "Data estimada de chegada e obrigatoria para compras e encomendas",
    path: ["dataEstimadaChegada"],
  }
);

const PecaUpdateSchema = z.object({
  id: z.string().cuid(),
  marca: z.string().min(1).optional(),
  modelo: z.string().min(1).optional(),
  ano: z.number().int().optional().nullable(),
  tamanhoCaixa: z.number().positive().optional(),
  materialCaixa: z.string().optional().nullable(),
  materialPulseira: z.string().optional().nullable(),
  movimento: z.string().optional().nullable(),
  referencia: z.string().optional().nullable(),
  calibre: z.string().optional().nullable(),
  valorCompra: z.number().nonnegative().optional(),
  valorEstimadoVenda: z.number().positive().optional(),
  valorRepasse: z.number().positive().optional().nullable(),
  percentualRepasse: z.number().positive().max(100).optional().nullable(),
  localizacao: z.string().optional(),
  dataEstimadaChegada: z.string().optional().nullable(),
});

const PecaListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sku: z.string().optional(),
  marca: z.string().optional(),
  fornecedor: z.string().optional(),
  status: z.enum(["DISPONIVEL", "EM_TRANSITO", "REVISAO", "VENDIDA", "DEFEITO", "PERDA"]).optional(),
  localizacao: z.string().optional(),
  origemTipo: z.enum(["COMPRA", "CONSIGNACAO", "ENCOMENDA"]).optional(),
  statusPagamentoFornecedor: z.enum(["PAGO", "PARCIAL", "NAO_PAGO"]).optional(),
  valorMin: z.number().nonnegative().optional(),
  valorMax: z.number().nonnegative().optional(),
  sortBy: z.enum(["createdAt", "valorEstimadoVenda", "lucroBruto"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  arquivado: z.boolean().default(false),
});

const StatusUpdateSchema = z.object({
  pecaId: z.string().cuid(),
  status: z.enum(["DISPONIVEL", "EM_TRANSITO", "REVISAO", "VENDIDA", "DEFEITO", "PERDA"]),
  localizacao: z.string().optional(),
  // O que precisa ser feito na revisao (ex: "revisao padrao", "trocar vidro").
  // Obrigatorio na ENTRADA em revisao — validado na mutation, que conhece o
  // status anterior (o LocationDialog reenvia o status atual sem esse campo).
  servicoRevisao: z.string().trim().max(500).optional(),
});

const PagamentoFornecedorSchema = z.object({
  pecaId: z.string().cuid(),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().optional(), // ISO date string
  observacao: z.string().optional(),
});

export const pecaRouter = router({
  // Listar pecas
  list: protectedProcedure
    .input(PecaListSchema)
    .query(async ({ input, ctx }) => {
      const {
        page, limit, search, sku, marca, fornecedor,
        status, localizacao, origemTipo,
        statusPagamentoFornecedor, valorMin, valorMax,
        sortBy, sortDir, arquivado,
      } = input;
      const skip = (page - 1) * limit;

      // Build AND conditions to avoid OR key conflicts
      const andConditions: Record<string, unknown>[] = [];

      if (marca) {
        andConditions.push({
          OR: [
            { marca: { contains: marca, mode: "insensitive" as const } },
            { modelo: { contains: marca, mode: "insensitive" as const } },
          ],
        });
      }

      if (search) {
        andConditions.push({
          OR: [
            { sku: { contains: search, mode: "insensitive" as const } },
            { marca: { contains: search, mode: "insensitive" as const } },
            { modelo: { contains: search, mode: "insensitive" as const } },
          ],
        });
      }

      const where = {
        arquivado,
        ...(status && { status }),
        ...(localizacao && { localizacao }),
        ...(origemTipo && { origemTipo }),
        ...(statusPagamentoFornecedor && { statusPagamentoFornecedor }),
        ...(sku && { sku: { contains: sku, mode: "insensitive" as const } }),
        ...(fornecedor && {
          fornecedor: { nome: { contains: fornecedor, mode: "insensitive" as const } },
        }),
        ...((valorMin !== undefined || valorMax !== undefined) && {
          valorEstimadoVenda: {
            ...(valorMin !== undefined && { gte: valorMin }),
            ...(valorMax !== undefined && { lte: valorMax }),
          },
        }),
        ...(andConditions.length > 0 && { AND: andConditions }),
      };

      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

      // Build orderBy — lucroBruto can't be sorted at DB level, fallback to valorEstimadoVenda
      const orderByField = sortBy === "lucroBruto" ? "valorEstimadoVenda" : sortBy;
      const orderBy = { [orderByField]: sortDir };

      const [pecas, total] = await Promise.all([
        prisma.peca.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            fotos: {
              take: 1,
              orderBy: { ordem: "asc" },
            },
            fornecedor: {
              select: { nome: true },
            },
            venda: {
              select: { valorFinal: true },
            },
          },
        }),
        prisma.peca.count({ where }),
      ]);

      // Config de imposto (Simples) carregada uma vez por requisicao,
      // usada para o lucro bruto liquido de imposto exibido na listagem.
      const impostoCfg = podeVerValores ? await carregarImpostoConfig() : null;

      // Ocultar valores se for funcionario
      const pecasFormatadas = pecas.map((peca) => {
        // Lucro bruto estimado JA liquido de imposto (Simples Nacional).
        // Usa o valor da venda (se vendida) ou o valor estimado de venda.
        const valorVenda = peca.venda
          ? Number(peca.venda.valorFinal) || 0
          : Number(peca.valorEstimadoVenda) || 0;
        const lucroBrutoEstimado =
          podeVerValores && impostoCfg && valorVenda
            ? calcularLucroBrutoEstoque(
                {
                  valorVenda,
                  origemTipo: peca.origemTipo,
                  valorCompra: Number(peca.valorCompra) || 0,
                  valorRepasse:
                    peca.valorRepasse != null ? Number(peca.valorRepasse) : null,
                  percentualRepasse:
                    peca.percentualRepasse != null
                      ? Number(peca.percentualRepasse)
                      : null,
                },
                impostoCfg
              )
            : null;

        return {
          ...peca,
          valorCompra: podeVerValores ? peca.valorCompra : null,
          valorEstimadoVenda: podeVerValores ? peca.valorEstimadoVenda : null,
          valorRepasse: podeVerValores ? peca.valorRepasse : null,
          percentualRepasse: podeVerValores ? peca.percentualRepasse : null,
          valorPagoFornecedor: podeVerValores ? peca.valorPagoFornecedor : null,
          statusPagamentoFornecedor: podeVerValores ? peca.statusPagamentoFornecedor : null,
          venda: podeVerValores ? peca.venda : null,
          lucroBrutoEstimado,
        };
      });

      return {
        pecas: pecasFormatadas,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Listar pecas disponiveis para venda (todas exceto VENDIDA)
  listParaVenda: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { page, limit, search } = input;
      const skip = (page - 1) * limit;

      const where = {
        arquivado: false,
        status: { notIn: ["VENDIDA", "DEFEITO", "PERDA"] as ("VENDIDA" | "DEFEITO" | "PERDA")[] },
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

      const pecasFormatadas = pecas.map((peca) => ({
        ...peca,
        valorCompra: podeVerValores ? peca.valorCompra : null,
        valorEstimadoVenda: podeVerValores ? peca.valorEstimadoVenda : null,
        valorRepasse: podeVerValores ? peca.valorRepasse : null,
        percentualRepasse: podeVerValores ? peca.percentualRepasse : null,
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
      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

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
          pagamentosFornecedor: {
            orderBy: { data: "desc" },
          },
        },
      });

      if (!peca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Peca nao encontrada",
        });
      }

      return {
        ...peca,
        valorCompra: podeVerValores ? peca.valorCompra : null,
        valorEstimadoVenda: podeVerValores ? peca.valorEstimadoVenda : null,
        valorRepasse: podeVerValores ? peca.valorRepasse : null,
        percentualRepasse: podeVerValores ? peca.percentualRepasse : null,
        valorPagoFornecedor: podeVerValores ? peca.valorPagoFornecedor : null,
        // Ocultar pagamentos se nao puder ver valores
        pagamentosFornecedor: podeVerValores ? peca.pagamentosFornecedor : [],
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
      try {
        // Validar consignacao - exigir pelo menos um tipo de repasse
        if (input.origemTipo === "CONSIGNACAO") {
          if (!input.valorRepasse && !input.percentualRepasse) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Valor de repasse ou percentual e obrigatorio para consignacao",
            });
          }
          if (input.valorRepasse && input.percentualRepasse) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Informe apenas valor fixo OU percentual, nao ambos",
            });
          }
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
            movimento: input.movimento,
            referencia: input.referencia,
            calibre: input.calibre,
            valorCompra: input.valorCompra,
            valorEstimadoVenda: input.valorEstimadoVenda,
            origemTipo: input.origemTipo,
            origemCanal: input.origemCanal,
            valorRepasse: input.percentualRepasse ? null : input.valorRepasse,
            percentualRepasse: input.valorRepasse ? null : input.percentualRepasse,
            revisada: input.revisada ?? false,
            localizacao: input.localizacao,
            status: "EM_TRANSITO",
            dataEstimadaChegada: input.dataEstimadaChegada
              ? new Date(input.dataEstimadaChegada)
              : null,
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
      } catch (error) {
        // Re-throw TRPCError as-is
        if (error instanceof TRPCError) throw error;
        // Log and wrap unknown errors with the actual message
        console.error("[peca.create] Erro:", error);
        const message = error instanceof Error ? error.message : "Erro desconhecido ao criar peca";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
          cause: error,
        });
      }
    }),

  // Atualizar peca
  update: protectedProcedure
    .input(PecaUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      // Garantir exclusividade mutua entre valorRepasse e percentualRepasse
      const updateData: Record<string, unknown> = { ...data };
      if (data.valorRepasse !== undefined && data.valorRepasse !== null) {
        updateData.percentualRepasse = null;
      }
      if (data.percentualRepasse !== undefined && data.percentualRepasse !== null) {
        updateData.valorRepasse = null;
      }
      // Converter data estimada de chegada (string ISO) para Date
      if (data.dataEstimadaChegada !== undefined) {
        updateData.dataEstimadaChegada = data.dataEstimadaChegada
          ? new Date(data.dataEstimadaChegada)
          : null;
      }

      const peca = await prisma.peca.update({
        where: { id },
        data: updateData,
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
      fotos: z.array(z.string().min(1)).min(1, "Minimo 1 foto obrigatoria"),
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
        select: { status: true, localizacao: true, servicoRevisao: true },
      });

      if (!peca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Peca nao encontrada",
        });
      }

      // Ao ENTRAR em revisao e obrigatorio dizer o que precisa ser feito
      const entrandoEmRevisao =
        input.status === "REVISAO" && peca.status !== "REVISAO";
      if (entrandoEmRevisao && !input.servicoRevisao) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Descreva o servico a ser feito na revisao",
        });
      }

      // Servico da revisao: preenchido ao entrar/permanecer em REVISAO,
      // limpo quando a peca sai da revisao.
      const servicoRevisao =
        input.status === "REVISAO" ? input.servicoRevisao ?? peca.servicoRevisao : null;

      // Observacao do historico: registra o servico solicitado na entrada em revisao
      const observacao =
        input.status === "REVISAO" && input.servicoRevisao ? input.servicoRevisao : null;

      // Atualizar peca e criar historico
      const pecaAtualizada = await prisma.peca.update({
        where: { id: input.pecaId },
        data: {
          status: input.status,
          localizacao: input.localizacao || peca.localizacao,
          servicoRevisao,
          historicoStatus: {
            create: {
              statusAnterior: peca.status,
              statusNovo: input.status,
              localizacaoAnterior: peca.localizacao,
              localizacaoNova: input.localizacao || peca.localizacao,
              observacao,
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
          ...(observacao ? { servicoRevisao: observacao } : {}),
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
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      // Deletar venda vinculada (se existir) antes de excluir a peca
      const venda = await prisma.venda.findUnique({
        where: { pecaId: input.id },
      });

      if (venda) {
        await prisma.venda.delete({
          where: { id: venda.id },
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
      "Horloge Brasil",
      "UTI dos Relógios",
      "Fornecedor",
      "Cliente Final",
    ];
  }),

  // Registrar pagamento ao fornecedor
  registrarPagamentoFornecedor: socioOuAdminProcedure
    .input(PagamentoFornecedorSchema)
    .mutation(async ({ input, ctx }) => {
      const peca = await prisma.peca.findUnique({
        where: { id: input.pecaId },
        select: {
          id: true,
          origemTipo: true,
          valorCompra: true,
          valorPagoFornecedor: true,
          status: true,
        },
      });

      if (!peca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Peca nao encontrada",
        });
      }

      // Para consignação, só pode pagar após a venda
      if (peca.origemTipo === "CONSIGNACAO" && peca.status !== "VENDIDA") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Peca consignada so pode ser paga ao fornecedor apos a venda",
        });
      }

      const valorDevido = Number(peca.valorCompra);
      const valorJaPago = Number(peca.valorPagoFornecedor);
      const novoValorPago = valorJaPago + input.valor;

      if (novoValorPago > valorDevido) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Valor excede o devido. Devido: R$ ${valorDevido.toFixed(2)}, Ja pago: R$ ${valorJaPago.toFixed(2)}, Restante: R$ ${(valorDevido - valorJaPago).toFixed(2)}`,
        });
      }

      // Determinar novo status
      let novoStatus: "PAGO" | "PARCIAL" | "NAO_PAGO" = "PARCIAL";
      if (novoValorPago >= valorDevido) {
        novoStatus = "PAGO";
      } else if (novoValorPago === 0) {
        novoStatus = "NAO_PAGO";
      }

      // Criar pagamento e atualizar peca
      const [pagamento] = await prisma.$transaction([
        prisma.pagamentoFornecedor.create({
          data: {
            pecaId: input.pecaId,
            valor: input.valor,
            data: input.data ? new Date(input.data) : new Date(),
            observacao: input.observacao,
          },
        }),
        prisma.peca.update({
          where: { id: input.pecaId },
          data: {
            valorPagoFornecedor: novoValorPago,
            statusPagamentoFornecedor: novoStatus,
            dataPagamentoFornecedor: new Date(),
          },
        }),
      ]);

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "PAGAR_FORNECEDOR",
        entidade: "PECA",
        entidadeId: input.pecaId,
        detalhes: {
          valor: input.valor,
          novoStatus,
          totalPago: novoValorPago,
        },
      });

      return pagamento;
    }),

  // Listar pagamentos ao fornecedor de uma peca
  getPagamentosFornecedor: protectedProcedure
    .input(z.object({ pecaId: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

      if (!podeVerValores) {
        return [];
      }

      const pagamentos = await prisma.pagamentoFornecedor.findMany({
        where: { pecaId: input.pecaId },
        orderBy: { data: "desc" },
      });

      return pagamentos;
    }),

  // Excluir pagamento ao fornecedor
  excluirPagamentoFornecedor: adminProcedure
    .input(z.object({
      pagamentoId: z.string().cuid(),
      pecaId: z.string().cuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const pagamento = await prisma.pagamentoFornecedor.findUnique({
        where: { id: input.pagamentoId },
      });

      if (!pagamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pagamento nao encontrado",
        });
      }

      const peca = await prisma.peca.findUnique({
        where: { id: input.pecaId },
        select: { valorCompra: true, valorPagoFornecedor: true },
      });

      if (!peca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Peca nao encontrada",
        });
      }

      const novoValorPago = Number(peca.valorPagoFornecedor) - Number(pagamento.valor);
      const valorDevido = Number(peca.valorCompra);

      // Determinar novo status
      let novoStatus: "PAGO" | "PARCIAL" | "NAO_PAGO" = "PARCIAL";
      if (novoValorPago >= valorDevido) {
        novoStatus = "PAGO";
      } else if (novoValorPago <= 0) {
        novoStatus = "NAO_PAGO";
      }

      await prisma.$transaction([
        prisma.pagamentoFornecedor.delete({
          where: { id: input.pagamentoId },
        }),
        prisma.peca.update({
          where: { id: input.pecaId },
          data: {
            valorPagoFornecedor: Math.max(0, novoValorPago),
            statusPagamentoFornecedor: novoStatus,
          },
        }),
      ]);

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EXCLUIR_PAGAMENTO_FORNECEDOR",
        entidade: "PECA",
        entidadeId: input.pecaId,
        detalhes: {
          pagamentoId: input.pagamentoId,
          valor: Number(pagamento.valor),
        },
      });

      return { success: true };
    }),

  // Metricas do estoque
  getMetricas: protectedProcedure.query(async ({ ctx }) => {
    const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

    // Contagem por status — KPIs do estoque consideram apenas peças PRÓPRIAS
    // (compra + encomenda; consignadas continuam visíveis nas listagens, financeiro, etc.)
    const [contagens, contagensOrigem] = await Promise.all([
      prisma.peca.groupBy({
        by: ["status"],
        where: { arquivado: false, origemTipo: filtroOrigemPropria },
        _count: true,
      }),
      // Card "Origem" — mostra propositalmente a divisão compra vs encomenda vs consignação
      prisma.peca.groupBy({
        by: ["origemTipo"],
        where: {
          arquivado: false,
          status: { not: "VENDIDA" },
        },
        _count: true,
      }),
    ]);

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
          origemTipo: filtroOrigemPropria,
        },
        select: { valorEstimadoVenda: true },
      });

      valorTotalEstoque = pecasEmEstoque.reduce(
        (acc, p) => acc + Number(p.valorEstimadoVenda),
        0
      );
    }

    const origemCount: Record<string, number> = {};
    contagensOrigem.forEach((c) => {
      origemCount[c.origemTipo] = c._count;
    });

    return {
      statusCount,
      origemCount,
      emEstoque,
      disponiveis: statusCount["DISPONIVEL"] || 0,
      estoqueIdeal,
      diferenca: (statusCount["DISPONIVEL"] || 0) - estoqueIdeal,
      valorTotalEstoque,
    };
  }),

  // Toggle exibir no catálogo
  toggleCatalogo: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      exibirNoCatalogo: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      await prisma.peca.update({
        where: { id: input.id },
        data: { exibirNoCatalogo: input.exibirNoCatalogo },
      });
      return { success: true };
    }),

  toggleRevisada: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      revisada: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      await prisma.peca.update({
        where: { id: input.id },
        data: { revisada: input.revisada },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "PECA",
        entidadeId: input.id,
        detalhes: { revisada: input.revisada },
      });

      return { success: true };
    }),

  // ============================================
  // PREVISÃO DE CHEGADAS
  // ============================================

  // Dados do gráfico cascata de previsão de chegadas
  getPrevisaoChegadas: protectedProcedure
    .input(z.object({ dias: z.union([z.literal(30), z.literal(60)]).default(30) }))
    .query(async ({ input }) => {
      // Calendário em horário do Brasil (UTC-3) para evitar erro de "virada de dia"
      const agoraBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const todayKey = agoraBR.toISOString().slice(0, 10);
      const todayUTC = new Date(`${todayKey}T00:00:00.000Z`);
      const lastKey = new Date(todayUTC.getTime() + input.dias * 86400000)
        .toISOString()
        .slice(0, 10);

      // Barra inicial: peças COMPRADAS já disponíveis fisicamente
      const estoqueAtual = await prisma.peca.count({
        where: { arquivado: false, origemTipo: filtroOrigemPropria, status: "DISPONIVEL" },
      });

      // Peças compradas ainda em trânsito, com data estimada definida
      const emTransito = await prisma.peca.findMany({
        where: {
          arquivado: false,
          origemTipo: filtroOrigemPropria,
          status: "EM_TRANSITO",
          dataEstimadaChegada: { not: null },
        },
        select: {
          sku: true,
          marca: true,
          modelo: true,
          dataEstimadaChegada: true,
        },
        orderBy: { dataEstimadaChegada: "asc" },
      });

      // Agrupar por dia. Atrasadas (data já passou) caem no dia de hoje.
      const buckets = new Map<string, { sku: string; marca: string; modelo: string }[]>();
      for (const p of emTransito) {
        if (!p.dataEstimadaChegada) continue;
        let key = p.dataEstimadaChegada.toISOString().slice(0, 10);
        if (key < todayKey) key = todayKey; // atrasada → hoje
        if (key > lastKey) continue; // fora do range visível
        const lista = buckets.get(key) ?? [];
        lista.push({ sku: p.sku, marca: p.marca, modelo: p.modelo });
        buckets.set(key, lista);
      }

      // Gerar TODOS os dias do período (timeline contínua), mesmo sem chegadas
      const chegadas: {
        data: string;
        label: string;
        quantidade: number;
        pecas: { sku: string; marca: string; modelo: string }[];
      }[] = [];
      for (let i = 0; i <= input.dias; i++) {
        const data = new Date(todayUTC.getTime() + i * 86400000)
          .toISOString()
          .slice(0, 10);
        const pecas = buckets.get(data) ?? [];
        const [, mes, dia] = data.split("-");
        chegadas.push({
          data,
          label: data === todayKey ? "Hoje" : `${dia}/${mes}`,
          quantidade: pecas.length,
          pecas,
        });
      }

      const totalChegadas = chegadas.reduce((acc, c) => acc + c.quantidade, 0);

      return {
        estoqueAtual,
        chegadas,
        totalPrevisto: estoqueAtual + totalChegadas,
      };
    }),

  // Peças compradas cuja data estimada já chegou/passou e ainda não foram confirmadas
  getChegadasPendentes: protectedProcedure.query(async () => {
    const agoraBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayKey = agoraBR.toISOString().slice(0, 10);
    const fimDeHoje = new Date(`${todayKey}T23:59:59.999Z`);

    const pendentes = await prisma.peca.findMany({
      where: {
        arquivado: false,
        origemTipo: filtroOrigemPropria,
        status: "EM_TRANSITO",
        dataEstimadaChegada: { not: null, lte: fimDeHoje },
      },
      select: {
        id: true,
        sku: true,
        marca: true,
        modelo: true,
        dataEstimadaChegada: true,
      },
      orderBy: { dataEstimadaChegada: "asc" },
    });

    return pendentes;
  }),

  // Confirmar chegada física da peça (em trânsito → disponível)
  confirmarChegada: protectedProcedure
    .input(z.object({ pecaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const peca = await prisma.peca.findUnique({
        where: { id: input.pecaId },
        select: { status: true, localizacao: true },
      });

      if (!peca) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Peca nao encontrada" });
      }

      const pecaAtualizada = await prisma.peca.update({
        where: { id: input.pecaId },
        data: {
          status: "DISPONIVEL",
          historicoStatus: {
            create: {
              statusAnterior: peca.status,
              statusNovo: "DISPONIVEL",
              localizacaoAnterior: peca.localizacao,
              localizacaoNova: peca.localizacao,
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
        detalhes: { statusAnterior: peca.status, statusNovo: "DISPONIVEL", motivo: "CHEGADA_CONFIRMADA" },
      });

      return pecaAtualizada;
    }),

  // Reagendar a data estimada de chegada
  reagendarChegada: protectedProcedure
    .input(z.object({ pecaId: z.string().cuid(), novaData: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const peca = await prisma.peca.update({
        where: { id: input.pecaId },
        data: { dataEstimadaChegada: new Date(input.novaData) },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "PECA",
        entidadeId: input.pecaId,
        detalhes: { dataEstimadaChegada: input.novaData },
      });

      return peca;
    }),
});
