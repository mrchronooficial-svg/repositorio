import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";
import { checkRateLimit, maybeCleanupBuckets } from "../services/rate-limit.service";

// ============================================
// SCHEMAS DE VALIDACAO
// ============================================

const StatusLeadEnum = z.enum([
  "NOVO",
  "EM_CONTATO",
  "NEGOCIANDO",
  "CONVERTIDO",
  "ARQUIVADO",
]);

const TipoBuscaEnum = z.enum(["ESPECIFICO", "DESCOBERTA"]);

const CondicaoEnum = z.enum(["COMPLETO", "SOMENTE_RELOGIO", "TANTO_FAZ"]);

// Telefone aceita digitos, espacos, +, (), - (validacao mais profunda no front)
const whatsappRegex = /^[+\d\s()-]{10,20}$/;

const LeadCreateSchema = z
  .object({
    // Dados pessoais
    nome: z.string().min(2, "Nome obrigatorio").max(150),
    email: z.string().email("E-mail invalido").max(150),
    whatsapp: z
      .string()
      .regex(whatsappRegex, "WhatsApp invalido")
      .max(30),
    instagram: z.string().max(60).optional().nullable(),
    // Tipo de busca
    tipoBusca: TipoBuscaEnum,
    // Modelo especifico
    modeloMarca: z.string().max(80).optional().nullable(),
    modeloNome: z.string().max(120).optional().nullable(),
    modeloTamanhoCaixa: z.string().max(20).optional().nullable(),
    modeloReferencia: z.string().max(60).optional().nullable(),
    modeloCondicao: CondicaoEnum.optional().nullable(),
    modeloLinkExemplo: z
      .string()
      .url("Link invalido")
      .max(500)
      .optional()
      .nullable()
      .or(z.literal("")),
    modeloObservacoes: z.string().max(500).optional().nullable(),
    // Descoberta
    descobertaEstilo: z.array(z.string().max(40)).max(20).default([]),
    descobertaMarcasInteresse: z.array(z.string().max(80)).max(40).default([]),
    descobertaTipoPulseira: z.array(z.string().max(40)).max(20).default([]),
    descobertaCorMostrador: z.array(z.string().max(40)).max(20).default([]),
    descobertaTamanhoCaixa: z.string().max(40).optional().nullable(),
    descobertaFaixaInvestimento: z.string().max(60).optional().nullable(),
    descobertaObservacoes: z.string().max(500).optional().nullable(),
    // Aceite
    aceiteComunicacao: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.tipoBusca === "ESPECIFICO") {
        return Boolean(data.modeloMarca && data.modeloNome && data.modeloCondicao);
      }
      return true;
    },
    {
      message: "Marca, modelo e condicao sao obrigatorios para busca especifica",
      path: ["modeloMarca"],
    },
  );

const LeadListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: StatusLeadEnum.optional(),
  tipoBusca: TipoBuscaEnum.optional(),
  // Lista de marcas — qualquer match (OR) entre modeloMarca e descobertaMarcasInteresse
  marcasInteresse: z.array(z.string().max(80)).max(40).optional(),
  dataInicio: z.string().optional(), // ISO date
  dataFim: z.string().optional(),    // ISO date
  incluirArquivados: z.boolean().default(false),
  sortBy: z.enum(["createdAt", "nome", "status"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const LeadUpdateStatusSchema = z.object({
  id: z.string().cuid(),
  status: StatusLeadEnum,
});

const LeadAddNotaSchema = z.object({
  id: z.string().cuid(),
  conteudo: z.string().min(1, "Nota nao pode ser vazia").max(2000),
});

// ============================================
// ROUTER
// ============================================

export const leadRouter = router({
  // ---------- LISTAR ----------
  list: protectedProcedure
    .input(LeadListSchema)
    .query(async ({ input }) => {
      const {
        page, limit, search, status, tipoBusca, marcasInteresse,
        dataInicio, dataFim, incluirArquivados, sortBy, sortDir,
      } = input;
      const skip = (page - 1) * limit;

      const andConditions: Record<string, unknown>[] = [];

      if (search) {
        andConditions.push({
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { whatsapp: { contains: search } },
          ],
        });
      }

      if (marcasInteresse && marcasInteresse.length > 0) {
        // OR entre todas as marcas selecionadas — em ambos os campos
        andConditions.push({
          OR: marcasInteresse.flatMap((marca) => [
            { modeloMarca: { equals: marca, mode: "insensitive" as const } },
            { descobertaMarcasInteresse: { has: marca } },
          ]),
        });
      }

      const where = {
        ...(status
          ? { status }
          : !incluirArquivados
            ? { status: { not: "ARQUIVADO" as const } }
            : {}),
        ...(tipoBusca && { tipoBusca }),
        ...((dataInicio || dataFim) && {
          createdAt: {
            ...(dataInicio && { gte: new Date(dataInicio) }),
            ...(dataFim && { lte: new Date(dataFim) }),
          },
        }),
        ...(andConditions.length > 0 && { AND: andConditions }),
      };

      const orderBy = { [sortBy]: sortDir };

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            status: true,
            nome: true,
            email: true,
            whatsapp: true,
            instagram: true,
            tipoBusca: true,
            modeloMarca: true,
            modeloNome: true,
            descobertaMarcasInteresse: true,
            createdAt: true,
          },
        }),
        prisma.lead.count({ where }),
      ]);

      return {
        leads,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // ---------- DETALHE ----------
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.id },
        include: {
          notas: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { name: true, email: true } } },
          },
          historicoStatus: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { name: true } } },
          },
        },
      });

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead nao encontrado" });
      }

      return lead;
    }),

  // ---------- CRIAR (PUBLICO, RATE-LIMITED) ----------
  create: publicProcedure
    .input(LeadCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // Rate limit: 5 requisicoes por IP a cada 1 hora
      const rate = checkRateLimit(`lead:create:${ctx.ip}`, {
        max: 5,
        windowMs: 60 * 60 * 1000,
      });
      maybeCleanupBuckets();

      if (!rate.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Muitas tentativas. Tente novamente em ${Math.ceil(rate.retryAfterSeconds / 60)} minuto(s).`,
        });
      }

      const lead = await prisma.lead.create({
        data: {
          status: "NOVO",
          nome: input.nome.trim(),
          email: input.email.trim().toLowerCase(),
          whatsapp: input.whatsapp.trim(),
          instagram: input.instagram?.trim().replace(/^@/, "") || null,
          tipoBusca: input.tipoBusca,
          modeloMarca: input.modeloMarca?.trim() || null,
          modeloNome: input.modeloNome?.trim() || null,
          modeloTamanhoCaixa: input.modeloTamanhoCaixa?.trim() || null,
          modeloReferencia: input.modeloReferencia?.trim() || null,
          modeloCondicao: input.modeloCondicao || null,
          modeloLinkExemplo: input.modeloLinkExemplo?.trim() || null,
          modeloObservacoes: input.modeloObservacoes?.trim() || null,
          descobertaEstilo: input.descobertaEstilo,
          descobertaMarcasInteresse: input.descobertaMarcasInteresse,
          descobertaTipoPulseira: input.descobertaTipoPulseira,
          descobertaCorMostrador: input.descobertaCorMostrador,
          descobertaTamanhoCaixa: input.descobertaTamanhoCaixa?.trim() || null,
          descobertaFaixaInvestimento: input.descobertaFaixaInvestimento?.trim() || null,
          descobertaObservacoes: input.descobertaObservacoes?.trim() || null,
          aceiteComunicacao: input.aceiteComunicacao,
          ipOrigem: ctx.ip,
          userAgent: ctx.userAgent,
          historicoStatus: {
            create: { statusNovo: "NOVO" },
          },
        },
        select: { id: true, createdAt: true },
      });

      return { id: lead.id, createdAt: lead.createdAt };
    }),

  // ---------- ATUALIZAR STATUS ----------
  updateStatus: protectedProcedure
    .input(LeadUpdateStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.id },
        select: { status: true },
      });

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead nao encontrado" });
      }

      if (lead.status === input.status) {
        return { id: input.id, status: input.status };
      }

      const atualizado = await prisma.lead.update({
        where: { id: input.id },
        data: {
          status: input.status,
          historicoStatus: {
            create: {
              statusAnterior: lead.status,
              statusNovo: input.status,
              userId: ctx.user.id,
            },
          },
        },
        select: { id: true, status: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "MUDAR_STATUS",
        entidade: "LEAD",
        entidadeId: input.id,
        detalhes: { statusAnterior: lead.status, statusNovo: input.status },
      });

      return atualizado;
    }),

  // ---------- ADICIONAR NOTA ----------
  addNota: protectedProcedure
    .input(LeadAddNotaSchema)
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.id },
        select: { id: true },
      });

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead nao encontrado" });
      }

      const nota = await prisma.notaLead.create({
        data: {
          leadId: input.id,
          conteudo: input.conteudo.trim(),
          userId: ctx.user.id,
        },
        include: { user: { select: { name: true, email: true } } },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ADICIONAR_NOTA",
        entidade: "LEAD",
        entidadeId: input.id,
      });

      return nota;
    }),

  // ---------- ARQUIVAR (DELETE = soft delete via status) ----------
  archive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.id },
        select: { status: true },
      });

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead nao encontrado" });
      }

      if (lead.status === "ARQUIVADO") {
        return { id: input.id, status: "ARQUIVADO" as const };
      }

      const atualizado = await prisma.lead.update({
        where: { id: input.id },
        data: {
          status: "ARQUIVADO",
          historicoStatus: {
            create: {
              statusAnterior: lead.status,
              statusNovo: "ARQUIVADO",
              userId: ctx.user.id,
            },
          },
        },
        select: { id: true, status: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ARQUIVAR",
        entidade: "LEAD",
        entidadeId: input.id,
        detalhes: { statusAnterior: lead.status },
      });

      return atualizado;
    }),

  // ---------- ESTATISTICAS ----------
  stats: protectedProcedure.query(async () => {
    const agrupados = await prisma.lead.groupBy({
      by: ["status"],
      _count: true,
    });

    const porStatus: Record<string, number> = {
      NOVO: 0,
      EM_CONTATO: 0,
      NEGOCIANDO: 0,
      CONVERTIDO: 0,
      ARQUIVADO: 0,
    };
    let total = 0;
    for (const grupo of agrupados) {
      porStatus[grupo.status] = grupo._count;
      total += grupo._count;
    }

    const inicio24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const inicio7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [novosUltimas24h, novosUltimos7Dias] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: inicio24h } } }),
      prisma.lead.count({ where: { createdAt: { gte: inicio7d } } }),
    ]);

    return {
      total,
      porStatus,
      novos: porStatus.NOVO ?? 0,
      ativos: total - (porStatus.ARQUIVADO ?? 0),
      novosUltimas24h,
      novosUltimos7Dias,
    };
  }),
});
