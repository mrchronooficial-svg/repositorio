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

const FaixaRendaAnualEnum = z.enum([
  "ATE_100K",
  "DE_100K_A_250K",
  "DE_250K_A_500K",
  "DE_500K_A_1M",
  "ACIMA_1M",
  "PREFIRO_NAO_INFORMAR",
]);

const ObjetivoComunidadeEnum = z.enum([
  "MELHORES_PRECOS",
  "NETWORKING",
  "EVENTOS",
  "ACESSO_ANTECIPADO",
  "WATCH_HUNT",
]);

const celularRegex = /^[+\d\s()-]{10,20}$/;

const LeadVipCreateSchema = z.object({
  nome: z.string().min(2, "Nome obrigatorio").max(150),
  celular: z.string().regex(celularRegex, "Celular invalido").max(30),
  email: z.string().email("E-mail invalido").max(150),
  nascimento: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data de nascimento invalida"),
  profissao: z.string().min(2, "Profissao obrigatoria").max(120),
  faixaRendaAnual: FaixaRendaAnualEnum,
  linkedinUrl: z
    .string()
    .url("Link LinkedIn invalido")
    .max(300)
    .optional()
    .nullable()
    .or(z.literal("")),
  jaColeciona: z.boolean(),
  marcasColecao: z.array(z.string().max(80)).max(40).default([]),
  marcaPreferida: z.string().max(80).optional().nullable(),
  relogioDosSonhos: z.string().max(300).optional().nullable(),
  maximoPagoRelogio: z.string().max(120).optional().nullable(),
  objetivosComunidade: z.array(ObjetivoComunidadeEnum).max(10).default([]),
});

const LeadVipListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: StatusLeadEnum.optional(),
  faixaRendaAnual: FaixaRendaAnualEnum.optional(),
  jaColeciona: z.boolean().optional(),
  objetivos: z.array(ObjetivoComunidadeEnum).max(10).optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  incluirArquivados: z.boolean().default(false),
  sortBy: z.enum(["createdAt", "nome", "status"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const LeadVipUpdateStatusSchema = z.object({
  id: z.string().cuid(),
  status: StatusLeadEnum,
});

const LeadVipAddNotaSchema = z.object({
  id: z.string().cuid(),
  conteudo: z.string().min(1, "Nota nao pode ser vazia").max(2000),
});

// ============================================
// ROUTER
// ============================================

export const leadVipRouter = router({
  // ---------- LISTAR ----------
  list: protectedProcedure
    .input(LeadVipListSchema)
    .query(async ({ input }) => {
      const {
        page, limit, search, status, faixaRendaAnual, jaColeciona,
        objetivos, dataInicio, dataFim, incluirArquivados, sortBy, sortDir,
      } = input;
      const skip = (page - 1) * limit;

      const andConditions: Record<string, unknown>[] = [];

      if (search) {
        andConditions.push({
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { celular: { contains: search } },
            { profissao: { contains: search, mode: "insensitive" as const } },
          ],
        });
      }

      if (objetivos && objetivos.length > 0) {
        andConditions.push({
          OR: objetivos.map((obj) => ({
            objetivosComunidade: { has: obj },
          })),
        });
      }

      const where = {
        ...(status
          ? { status }
          : !incluirArquivados
            ? { status: { not: "ARQUIVADO" as const } }
            : {}),
        ...(faixaRendaAnual && { faixaRendaAnual }),
        ...(jaColeciona !== undefined && { jaColeciona }),
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
        prisma.leadVip.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            status: true,
            nome: true,
            email: true,
            celular: true,
            profissao: true,
            faixaRendaAnual: true,
            jaColeciona: true,
            marcaPreferida: true,
            objetivosComunidade: true,
            createdAt: true,
          },
        }),
        prisma.leadVip.count({ where }),
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
      const lead = await prisma.leadVip.findUnique({
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead VIP nao encontrado" });
      }

      return lead;
    }),

  // ---------- CRIAR (PUBLICO, RATE-LIMITED) ----------
  create: publicProcedure
    .input(LeadVipCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const rate = checkRateLimit(`lead-vip:create:${ctx.ip}`, {
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

      const lead = await prisma.leadVip.create({
        data: {
          status: "NOVO",
          nome: input.nome.trim(),
          celular: input.celular.trim(),
          email: input.email.trim().toLowerCase(),
          nascimento: new Date(input.nascimento),
          profissao: input.profissao.trim(),
          faixaRendaAnual: input.faixaRendaAnual,
          linkedinUrl: input.linkedinUrl?.trim() || null,
          jaColeciona: input.jaColeciona,
          marcasColecao: input.jaColeciona ? input.marcasColecao : [],
          marcaPreferida: input.marcaPreferida?.trim() || null,
          relogioDosSonhos: input.relogioDosSonhos?.trim() || null,
          maximoPagoRelogio: input.maximoPagoRelogio?.trim() || null,
          objetivosComunidade: input.objetivosComunidade,
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
    .input(LeadVipUpdateStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.leadVip.findUnique({
        where: { id: input.id },
        select: { status: true },
      });

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead VIP nao encontrado" });
      }

      if (lead.status === input.status) {
        return { id: input.id, status: input.status };
      }

      const atualizado = await prisma.leadVip.update({
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
        entidade: "LEAD_VIP",
        entidadeId: input.id,
        detalhes: { statusAnterior: lead.status, statusNovo: input.status },
      });

      return atualizado;
    }),

  // ---------- ADICIONAR NOTA ----------
  addNota: protectedProcedure
    .input(LeadVipAddNotaSchema)
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.leadVip.findUnique({
        where: { id: input.id },
        select: { id: true },
      });

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead VIP nao encontrado" });
      }

      const nota = await prisma.notaLeadVip.create({
        data: {
          leadVipId: input.id,
          conteudo: input.conteudo.trim(),
          userId: ctx.user.id,
        },
        include: { user: { select: { name: true, email: true } } },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ADICIONAR_NOTA",
        entidade: "LEAD_VIP",
        entidadeId: input.id,
      });

      return nota;
    }),

  // ---------- ARQUIVAR ----------
  archive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.leadVip.findUnique({
        where: { id: input.id },
        select: { status: true },
      });

      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead VIP nao encontrado" });
      }

      if (lead.status === "ARQUIVADO") {
        return { id: input.id, status: "ARQUIVADO" as const };
      }

      const atualizado = await prisma.leadVip.update({
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
        entidade: "LEAD_VIP",
        entidadeId: input.id,
        detalhes: { statusAnterior: lead.status },
      });

      return atualizado;
    }),

  // ---------- ESTATISTICAS ----------
  stats: protectedProcedure.query(async () => {
    const agrupados = await prisma.leadVip.groupBy({
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
      prisma.leadVip.count({ where: { createdAt: { gte: inicio24h } } }),
      prisma.leadVip.count({ where: { createdAt: { gte: inicio7d } } }),
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
