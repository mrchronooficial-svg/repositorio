import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, socioOuAdminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";
import { calcularValorDeclararAutomatico } from "../utils/valor-declarar";
import {
  CONFIG_EMISSAO_AUTOMATICA,
  cancelarNotasVenda,
  emissaoAutomaticaLigada,
  emitirNotasVenda,
  enotasConfigurado,
  reemitirNotasVenda,
  sincronizarNotasPendentes,
} from "../services/enotas.service";

// Filtros da aba NFe
const STATUS_FILTRO = [
  "PENDENTE", // sem nota (nem emitida pela integracao, nem marcada a mao)
  "PROCESSANDO",
  "EMITIDA",
  "ERRO",
  "CANCELADA",
  "DECLARADA_MANUAL", // vendas antigas marcadas a mao como declaradas
] as const;

const NfeListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(STATUS_FILTRO).optional(),
});

type VendaWhere = NonNullable<NonNullable<Parameters<typeof prisma.venda.findMany>[0]>["where"]>;

function filtroPorStatus(status: (typeof STATUS_FILTRO)[number] | undefined): VendaWhere {
  switch (status) {
    case "PENDENTE":
      return { cancelada: false, nfeDeclarada: false, notasFiscais: { none: { ativa: true } } };
    case "PROCESSANDO":
      return {
        notasFiscais: {
          some: { ativa: true, status: { in: ["PROCESSANDO", "CANCELAMENTO_PROCESSANDO"] } },
        },
      };
    case "EMITIDA":
      return { cancelada: false, notasFiscais: { some: { ativa: true, status: "EMITIDA" } } };
    case "ERRO":
      return {
        notasFiscais: {
          some: {
            OR: [
              { ativa: true, status: "ERRO" },
              { status: "FALHA_CANCELAMENTO" },
            ],
          },
        },
      };
    case "CANCELADA":
      return { cancelada: true, notasFiscais: { some: {} } };
    case "DECLARADA_MANUAL":
      return { cancelada: false, nfeDeclarada: true, notasFiscais: { none: {} } };
    default:
      // Todas as vendas ativas + vendas canceladas que tiveram nota pela integracao
      return { OR: [{ cancelada: false }, { notasFiscais: { some: {} } }] };
  }
}

const ValorDeclararSchema = z.object({
  vendaId: z.string().cuid(),
  valor: z.number().nonnegative("Valor nao pode ser negativo").max(9_999_999.99),
  // Quando true e a venda ja tem NF-e, cancela a nota atual e emite outra com o novo valor
  reemitirNfe: z.boolean().optional().default(false),
});

async function vendaTemNotaViva(vendaId: string): Promise<boolean> {
  const count = await prisma.notaFiscal.count({
    where: { vendaId, ativa: true, status: { in: ["PROCESSANDO", "EMITIDA"] } },
  });
  return count > 0;
}

function exigirEnotasConfigurado() {
  if (!enotasConfigurado()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Integracao com o eNotas nao configurada (falta a API Key)",
    });
  }
}

export const nfeRouter = router({
  // Listar vendas para controle de NFe
  list: socioOuAdminProcedure.input(NfeListSchema).query(async ({ input }) => {
    const { page, limit, search, status } = input;
    const skip = (page - 1) * limit;

    const where: VendaWhere = {
      AND: [
        filtroPorStatus(status),
        ...(search
          ? [
              {
                OR: [
                  { peca: { sku: { contains: search, mode: "insensitive" as const } } },
                  { cliente: { nome: { contains: search, mode: "insensitive" as const } } },
                ],
              },
            ]
          : []),
      ],
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
          statusPagamento: true,
          cancelada: true,
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
          notasFiscais: {
            orderBy: [{ emissao: "desc" }, { parte: "asc" }],
            select: {
              id: true,
              emissao: true,
              parte: true,
              totalPartes: true,
              valor: true,
              ativa: true,
              status: true,
              numero: true,
              pdfUrl: true,
              xmlUrl: true,
              mensagemErro: true,
              emitidaEm: true,
              canceladaEm: true,
            },
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
  getMetricas: socioOuAdminProcedure.query(async () => {
    const [pendentes, emitidas, comProblema, processando, somaPendente] = await Promise.all([
      prisma.venda.count({ where: filtroPorStatus("PENDENTE") }),
      prisma.venda.count({
        where: {
          cancelada: false,
          OR: [
            { notasFiscais: { some: { ativa: true, status: "EMITIDA" } } },
            { nfeDeclarada: true, notasFiscais: { none: {} } },
          ],
        },
      }),
      prisma.venda.count({ where: filtroPorStatus("ERRO") }),
      prisma.venda.count({ where: filtroPorStatus("PROCESSANDO") }),
      prisma.venda.aggregate({
        where: filtroPorStatus("PENDENTE"),
        _sum: { valorDeclarar: true },
      }),
    ]);

    return {
      pendentes,
      // nome mantido por compatibilidade: vendas com NF-e (integracao ou marcadas a mao)
      declaradas: emitidas,
      comProblema,
      processando,
      valorPendente: Number(somaPendente._sum?.valorDeclarar || 0),
    };
  }),

  // Configuracao da integracao (aba NFe)
  getConfig: socioOuAdminProcedure.query(async () => {
    return {
      configurado: enotasConfigurado(),
      emissaoAutomatica: await emissaoAutomaticaLigada(),
    };
  }),

  setEmissaoAutomatica: socioOuAdminProcedure
    .input(z.object({ ligada: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (input.ligada) exigirEnotasConfigurado();
      await prisma.configuracao.upsert({
        where: { chave: CONFIG_EMISSAO_AUTOMATICA },
        create: { chave: CONFIG_EMISSAO_AUTOMATICA, valor: String(input.ligada) },
        update: { valor: String(input.ligada) },
      });
      await registrarAuditoria({
        userId: ctx.user.id,
        acao: input.ligada ? "LIGAR_EMISSAO_AUTOMATICA_NFE" : "DESLIGAR_EMISSAO_AUTOMATICA_NFE",
        entidade: "CONFIGURACAO",
        entidadeId: CONFIG_EMISSAO_AUTOMATICA,
        detalhes: {},
      });
      return { success: true };
    }),

  // Emitir (ou tentar de novo) a NF-e de uma venda manualmente
  emitir: socioOuAdminProcedure
    .input(
      z.object({
        vendaId: z.string().cuid(),
        // true = o usuario confirmou que nao e duplicidade com nota emitida pelo CSV
        ignorarDuplicidade: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      exigirEnotasConfigurado();
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        select: { cancelada: true, peca: { select: { sku: true } } },
      });
      if (!venda) throw new TRPCError({ code: "NOT_FOUND", message: "Venda nao encontrada" });
      if (venda.cancelada) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Venda cancelada nao pode emitir NF-e" });
      }

      const resultado = await emitirNotasVenda(input.vendaId, {
        ignorarDuplicidade: input.ignorarDuplicidade,
      });

      if (resultado.possivelDuplicidade) {
        throw new TRPCError({ code: "CONFLICT", message: resultado.possivelDuplicidade });
      }

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EMITIR_NFE",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: { peca: venda.peca.sku, ...resultado },
      });

      if (resultado.ignorada) {
        throw new TRPCError({ code: "BAD_REQUEST", message: resultado.ignorada });
      }
      return resultado;
    }),

  // Cancelar a(s) nota(s) atual(is) e emitir de novo com o valor a declarar atual
  reemitir: socioOuAdminProcedure
    .input(z.object({ vendaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      exigirEnotasConfigurado();
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        select: { cancelada: true, peca: { select: { sku: true } } },
      });
      if (!venda) throw new TRPCError({ code: "NOT_FOUND", message: "Venda nao encontrada" });
      if (venda.cancelada) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Venda cancelada nao pode emitir NF-e" });
      }

      const resultado = await reemitirNotasVenda(input.vendaId);

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "REEMITIR_NFE",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: { peca: venda.peca.sku, ...resultado },
      });

      return resultado;
    }),

  // Tentar cancelar de novo notas cujo cancelamento falhou
  tentarCancelarNovamente: socioOuAdminProcedure
    .input(z.object({ vendaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      exigirEnotasConfigurado();
      // Notas com falha que ja nao sao as ativas (reemissao) tambem devem ser canceladas
      await prisma.notaFiscal.updateMany({
        where: { vendaId: input.vendaId, status: "FALHA_CANCELAMENTO" },
        data: { ativa: true },
      });
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        select: { cancelada: true },
      });
      const resultado = await cancelarNotasVenda(input.vendaId);
      // Em venda ativa, as notas canceladas nao sao mais as ativas
      if (venda && !venda.cancelada) {
        await prisma.notaFiscal.updateMany({
          where: {
            vendaId: input.vendaId,
            status: { in: ["CANCELAMENTO_PROCESSANDO", "CANCELADA"] },
          },
          data: { ativa: false },
        });
      }

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CANCELAR_NFE",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: { ...resultado },
      });

      return resultado;
    }),

  // Consultar agora no eNotas as notas em processamento
  sincronizar: socioOuAdminProcedure.mutation(async () => {
    const consultadas = await sincronizarNotasPendentes({ intervaloMinimoMs: 10_000, limite: 30 });
    return { consultadas };
  }),

  // Usado pelo aviso no topo do sistema (todas as paginas). Tambem atualiza notas
  // em processamento, ja que o eNotas Emissor nao envia webhooks.
  getProblemas: socioOuAdminProcedure.query(async () => {
    try {
      await sincronizarNotasPendentes({ intervaloMinimoMs: 60_000, limite: 5 });
    } catch (error) {
      console.error("[eNotas] Erro na sincronizacao automatica", error);
    }

    const [erros, falhasCancelamento] = await Promise.all([
      prisma.venda.count({
        where: { cancelada: false, notasFiscais: { some: { ativa: true, status: "ERRO" } } },
      }),
      prisma.venda.count({
        where: { notasFiscais: { some: { status: "FALHA_CANCELAMENTO" } } },
      }),
    ]);

    return { erros, falhasCancelamento, total: erros + falhasCancelamento };
  }),

  // Marcar como declarada (vendas antigas, emitidas fora da integracao)
  marcarDeclarada: socioOuAdminProcedure
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
  desmarcarDeclarada: socioOuAdminProcedure
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
  // Com reemitirNfe = true e NF-e ja emitida, cancela a nota e emite outra com o novo valor.
  definirValorDeclarar: socioOuAdminProcedure
    .input(ValorDeclararSchema)
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
      const valorAnterior = venda.valorDeclarar ? Number(venda.valorDeclarar) : null;

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
          valorAnterior,
          valorNovo: valor,
        },
      });

      const reemissao =
        input.reemitirNfe && valor !== valorAnterior && (await vendaTemNotaViva(input.vendaId))
          ? await reemitirNotasVenda(input.vendaId)
          : null;

      return { success: true, valorDeclarar: valor, reemissao };
    }),

  // Voltar ao valor calculado automaticamente pela regra padrao
  voltarValorAutomatico: socioOuAdminProcedure
    .input(
      z.object({
        vendaId: z.string().cuid(),
        reemitirNfe: z.boolean().optional().default(false),
      })
    )
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
      const valorAnterior = venda.valorDeclarar ? Number(venda.valorDeclarar) : null;

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
          valorAnterior,
          valorNovo: valor,
        },
      });

      const reemissao =
        input.reemitirNfe && valor !== valorAnterior && (await vendaTemNotaViva(input.vendaId))
          ? await reemitirNotasVenda(input.vendaId)
          : null;

      return { success: true, valorDeclarar: valor, reemissao };
    }),
});
