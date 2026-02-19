import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";
import { gerarDRE, gerarBalanco, gerarDFC } from "../services/demonstrativos.service";
import { calcularRBT12, calcularAliquotaEfetiva } from "../services/simples-nacional.service";
import { criarLancamentosVenda, reverterLancamentosVenda } from "../services/lancamento-venda.service";

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const ContaContabilCreateSchema = z.object({
  codigo: z.string().min(1, "Código obrigatório").max(20),
  nome: z.string().min(1, "Nome obrigatório").max(100),
  tipo: z.enum(["GRUPO", "SUBGRUPO", "ANALITICA"]),
  natureza: z.enum(["DEVEDORA", "CREDORA"]),
  contaPaiId: z.string().cuid().nullable().optional(),
  ordem: z.number().int().min(0).optional(),
});

const ContaContabilUpdateSchema = z.object({
  id: z.string().cuid(),
  codigo: z.string().min(1).max(20).optional(),
  nome: z.string().min(1).max(100).optional(),
  tipo: z.enum(["GRUPO", "SUBGRUPO", "ANALITICA"]).optional(),
  natureza: z.enum(["DEVEDORA", "CREDORA"]).optional(),
  contaPaiId: z.string().cuid().nullable().optional(),
  ordem: z.number().int().min(0).optional(),
  ativa: z.boolean().optional(),
});

const ContaBancariaCreateSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  banco: z.string().min(1, "Banco obrigatório"),
  agencia: z.string().nullable().optional(),
  conta: z.string().nullable().optional(),
  contaContabilId: z.string().cuid("Conta contábil obrigatória"),
  saldoInicial: z.number().min(0).optional(),
});

const ContaBancariaUpdateSchema = z.object({
  id: z.string().cuid(),
  nome: z.string().min(1).optional(),
  banco: z.string().min(1).optional(),
  agencia: z.string().nullable().optional(),
  conta: z.string().nullable().optional(),
  saldoInicial: z.number().min(0).optional(),
  ativa: z.boolean().optional(),
});

// ============================================
// ROUTER FINANCEIRO
// ============================================

export const financeiroRouter = router({
  // =========================================
  // PLANO DE CONTAS
  // =========================================

  // Listar todas as contas (árvore hierárquica)
  listContas: adminProcedure.query(async () => {
    const contas = await prisma.contaContabil.findMany({
      orderBy: [{ codigo: "asc" }],
      include: {
        _count: {
          select: {
            linhasDebito: true,
            linhasCredito: true,
            contasFilhas: true,
          },
        },
      },
    });

    return contas;
  }),

  // Buscar conta por ID
  getContaById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const conta = await prisma.contaContabil.findUnique({
        where: { id: input.id },
        include: {
          contaPai: { select: { id: true, codigo: true, nome: true } },
          contasFilhas: {
            orderBy: { ordem: "asc" },
            select: { id: true, codigo: true, nome: true, tipo: true },
          },
          _count: {
            select: {
              linhasDebito: true,
              linhasCredito: true,
            },
          },
        },
      });

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });
      }

      return conta;
    }),

  // Criar conta contábil
  createConta: adminProcedure
    .input(ContaContabilCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // Verificar se código já existe
      const existente = await prisma.contaContabil.findUnique({
        where: { codigo: input.codigo },
      });
      if (existente) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Já existe uma conta com o código ${input.codigo}`,
        });
      }

      // Verificar conta pai se fornecida
      if (input.contaPaiId) {
        const contaPai = await prisma.contaContabil.findUnique({
          where: { id: input.contaPaiId },
        });
        if (!contaPai) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Conta pai não encontrada" });
        }
      }

      const conta = await prisma.contaContabil.create({
        data: {
          codigo: input.codigo,
          nome: input.nome,
          tipo: input.tipo,
          natureza: input.natureza,
          contaPaiId: input.contaPaiId ?? null,
          ordem: input.ordem ?? 0,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "CONTA_CONTABIL",
        entidadeId: conta.id,
        detalhes: { codigo: conta.codigo, nome: conta.nome },
      });

      return conta;
    }),

  // Editar conta contábil
  updateConta: adminProcedure
    .input(ContaContabilUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const conta = await prisma.contaContabil.findUnique({
        where: { id: input.id },
      });

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });
      }

      // Verificar código único se alterado
      if (input.codigo && input.codigo !== conta.codigo) {
        const existente = await prisma.contaContabil.findUnique({
          where: { codigo: input.codigo },
        });
        if (existente) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe uma conta com o código ${input.codigo}`,
          });
        }
      }

      // Verificar conta pai se alterada
      if (input.contaPaiId !== undefined && input.contaPaiId !== conta.contaPaiId) {
        if (input.contaPaiId) {
          // Não pode ser pai de si mesmo
          if (input.contaPaiId === input.id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Uma conta não pode ser pai de si mesma",
            });
          }
          const contaPai = await prisma.contaContabil.findUnique({
            where: { id: input.contaPaiId },
          });
          if (!contaPai) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Conta pai não encontrada" });
          }
        }
      }

      const { id, ...updateData } = input;
      const contaAtualizada = await prisma.contaContabil.update({
        where: { id },
        data: updateData,
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "CONTA_CONTABIL",
        entidadeId: id,
        detalhes: { campos: Object.keys(updateData) },
      });

      return contaAtualizada;
    }),

  // Excluir conta contábil (apenas se sem lançamentos)
  deleteConta: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const conta = await prisma.contaContabil.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              linhasDebito: true,
              linhasCredito: true,
              contasFilhas: true,
            },
          },
        },
      });

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });
      }

      if (conta.sistematica) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Conta sistemática não pode ser excluída",
        });
      }

      if (conta._count.linhasDebito > 0 || conta._count.linhasCredito > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível excluir conta com lançamentos vinculados",
        });
      }

      if (conta._count.contasFilhas > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível excluir conta com subcontas. Exclua as subcontas primeiro.",
        });
      }

      await prisma.contaContabil.delete({ where: { id: input.id } });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EXCLUIR",
        entidade: "CONTA_CONTABIL",
        entidadeId: input.id,
        detalhes: { codigo: conta.codigo, nome: conta.nome },
      });

      return { success: true };
    }),

  // Reordenar contas
  reorderContas: adminProcedure
    .input(
      z.object({
        itens: z.array(
          z.object({
            id: z.string().cuid(),
            ordem: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.$transaction(
        input.itens.map((item) =>
          prisma.contaContabil.update({
            where: { id: item.id },
            data: { ordem: item.ordem },
          })
        )
      );
      return { success: true };
    }),

  // Listar contas analíticas (para selects em formulários)
  listContasAnaliticas: adminProcedure.query(async () => {
    const contas = await prisma.contaContabil.findMany({
      where: { tipo: "ANALITICA", ativa: true },
      orderBy: { codigo: "asc" },
      select: {
        id: true,
        codigo: true,
        nome: true,
        natureza: true,
      },
    });
    return contas;
  }),

  // =========================================
  // CONTAS BANCÁRIAS
  // =========================================

  // Listar contas bancárias
  listContasBancarias: adminProcedure.query(async () => {
    const contas = await prisma.contaBancaria.findMany({
      orderBy: { nome: "asc" },
      include: {
        contaContabil: {
          select: { id: true, codigo: true, nome: true },
        },
      },
    });
    return contas;
  }),

  // Buscar conta bancária por ID
  getContaBancariaById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const conta = await prisma.contaBancaria.findUnique({
        where: { id: input.id },
        include: {
          contaContabil: {
            select: { id: true, codigo: true, nome: true },
          },
        },
      });

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta bancária não encontrada" });
      }

      return conta;
    }),

  // Criar conta bancária
  createContaBancaria: adminProcedure
    .input(ContaBancariaCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // Verificar se a conta contábil existe e é analítica
      const contaContabil = await prisma.contaContabil.findUnique({
        where: { id: input.contaContabilId },
      });

      if (!contaContabil) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta contábil não encontrada" });
      }

      if (contaContabil.tipo !== "ANALITICA") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Conta bancária deve ser vinculada a uma conta analítica",
        });
      }

      // Verificar se a conta contábil já está vinculada a outra conta bancária
      const existente = await prisma.contaBancaria.findUnique({
        where: { contaContabilId: input.contaContabilId },
      });
      if (existente) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Esta conta contábil já está vinculada a outra conta bancária",
        });
      }

      const conta = await prisma.contaBancaria.create({
        data: {
          nome: input.nome,
          banco: input.banco,
          agencia: input.agencia ?? null,
          conta: input.conta ?? null,
          contaContabilId: input.contaContabilId,
          saldoInicial: input.saldoInicial ?? 0,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "CONTA_BANCARIA",
        entidadeId: conta.id,
        detalhes: { nome: conta.nome, banco: conta.banco },
      });

      return conta;
    }),

  // Editar conta bancária
  updateContaBancaria: adminProcedure
    .input(ContaBancariaUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const conta = await prisma.contaBancaria.findUnique({
        where: { id: input.id },
      });

      if (!conta) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta bancária não encontrada" });
      }

      const { id, ...updateData } = input;
      const contaAtualizada = await prisma.contaBancaria.update({
        where: { id },
        data: updateData,
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "CONTA_BANCARIA",
        entidadeId: id,
        detalhes: { campos: Object.keys(updateData) },
      });

      return contaAtualizada;
    }),

  // =========================================
  // LANÇAMENTOS CONTÁBEIS
  // =========================================

  // Listar lançamentos com filtros
  listLancamentos: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
        tipo: z.enum(["MANUAL", "AUTOMATICO_VENDA", "AUTOMATICO_DESPESA_RECORRENTE", "TRANSFERENCIA", "DISTRIBUICAO_LUCROS", "ANTECIPACAO"]).optional(),
        dataInicio: z.coerce.date().optional(),
        dataFim: z.coerce.date().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, tipo, dataInicio, dataFim, search } = input;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        estornado: false,
        ...(tipo && { tipo }),
        ...(search && {
          descricao: { contains: search, mode: "insensitive" },
        }),
      };

      if (dataInicio || dataFim) {
        const dataFilter: Record<string, Date> = {};
        if (dataInicio) dataFilter.gte = dataInicio;
        if (dataFim) dataFilter.lte = dataFim;
        where.data = dataFilter;
      }

      const [lancamentos, total] = await Promise.all([
        prisma.lancamento.findMany({
          where,
          skip,
          take: limit,
          orderBy: { data: "desc" },
          include: {
            linhas: {
              include: {
                contaDebito: { select: { codigo: true, nome: true } },
                contaCredito: { select: { codigo: true, nome: true } },
              },
            },
          },
        }),
        prisma.lancamento.count({ where }),
      ]);

      return {
        lancamentos,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Buscar lançamento por ID
  getLancamentoById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const lancamento = await prisma.lancamento.findUnique({
        where: { id: input.id },
        include: {
          linhas: {
            include: {
              contaDebito: { select: { id: true, codigo: true, nome: true } },
              contaCredito: { select: { id: true, codigo: true, nome: true } },
            },
          },
        },
      });

      if (!lancamento) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lancamento nao encontrado" });
      }

      return lancamento;
    }),

  // Criar lançamento manual
  createLancamento: adminProcedure
    .input(
      z.object({
        data: z.coerce.date(),
        descricao: z.string().min(1, "Descricao obrigatoria"),
        recorrente: z.boolean().default(true),
        linhas: z
          .array(
            z.object({
              contaDebitoId: z.string().cuid(),
              contaCreditoId: z.string().cuid(),
              valor: z.number().positive("Valor deve ser positivo"),
              historico: z.string().optional(),
            })
          )
          .min(1, "Pelo menos uma linha e obrigatoria"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validar que todas as contas existem e são analíticas
      const contaIds = new Set<string>();
      for (const linha of input.linhas) {
        contaIds.add(linha.contaDebitoId);
        contaIds.add(linha.contaCreditoId);
      }

      const contas = await prisma.contaContabil.findMany({
        where: { id: { in: Array.from(contaIds) } },
        select: { id: true, tipo: true },
      });

      if (contas.length !== contaIds.size) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uma ou mais contas nao foram encontradas",
        });
      }

      const naoAnaliticas = contas.filter((c) => c.tipo !== "ANALITICA");
      if (naoAnaliticas.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lancamentos so podem ser feitos em contas analiticas",
        });
      }

      // Validar que débito != crédito em cada linha
      for (const linha of input.linhas) {
        if (linha.contaDebitoId === linha.contaCreditoId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Conta debito e credito nao podem ser iguais na mesma linha",
          });
        }
      }

      const lancamento = await prisma.lancamento.create({
        data: {
          data: input.data,
          descricao: input.descricao,
          tipo: "MANUAL",
          recorrente: input.recorrente,
          userId: ctx.user.id,
          linhas: {
            create: input.linhas.map((l) => ({
              contaDebitoId: l.contaDebitoId,
              contaCreditoId: l.contaCreditoId,
              valor: l.valor,
              historico: l.historico,
            })),
          },
        },
        include: {
          linhas: {
            include: {
              contaDebito: { select: { codigo: true, nome: true } },
              contaCredito: { select: { codigo: true, nome: true } },
            },
          },
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "LANCAMENTO",
        entidadeId: lancamento.id,
        detalhes: {
          descricao: lancamento.descricao,
          totalLinhas: lancamento.linhas.length,
        },
      });

      return lancamento;
    }),

  // Importar lançamentos em lote (planilha)
  importarLancamentos: adminProcedure
    .input(
      z.object({
        lancamentos: z
          .array(
            z.object({
              data: z.coerce.date(),
              descricao: z.string().min(1, "Descricao obrigatoria"),
              valor: z.number().positive("Valor deve ser positivo"),
              contaDebitoId: z.string().cuid(),
              contaCreditoId: z.string().cuid(),
            })
          )
          .min(1, "Pelo menos um lancamento")
          .max(500, "Maximo 500 lancamentos por importacao"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Coletar todas as contas únicas
      const contaIds = new Set<string>();
      for (const l of input.lancamentos) {
        contaIds.add(l.contaDebitoId);
        contaIds.add(l.contaCreditoId);
      }

      const contas = await prisma.contaContabil.findMany({
        where: { id: { in: Array.from(contaIds) } },
        select: { id: true, tipo: true },
      });

      if (contas.length !== contaIds.size) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uma ou mais contas nao foram encontradas",
        });
      }

      const naoAnaliticas = contas.filter((c) => c.tipo !== "ANALITICA");
      if (naoAnaliticas.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lancamentos so podem ser feitos em contas analiticas",
        });
      }

      for (const l of input.lancamentos) {
        if (l.contaDebitoId === l.contaCreditoId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Conta debito e credito nao podem ser iguais na mesma linha",
          });
        }
      }

      // Criar todos os lançamentos em transação
      const resultado = await prisma.$transaction(
        input.lancamentos.map((l) =>
          prisma.lancamento.create({
            data: {
              data: l.data,
              descricao: l.descricao,
              tipo: "MANUAL",
              recorrente: true,
              userId: ctx.user.id,
              linhas: {
                create: {
                  contaDebitoId: l.contaDebitoId,
                  contaCreditoId: l.contaCreditoId,
                  valor: l.valor,
                },
              },
            },
          })
        )
      );

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "LANCAMENTO",
        entidadeId: resultado[0]?.id ?? "batch",
        detalhes: {
          tipo: "IMPORTACAO_PLANILHA",
          quantidade: resultado.length,
        },
      });

      return { quantidade: resultado.length };
    }),

  // Estornar lançamento
  estornarLancamento: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const lancamento = await prisma.lancamento.findUnique({
        where: { id: input.id },
        include: { linhas: true },
      });

      if (!lancamento) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lancamento nao encontrado" });
      }

      if (lancamento.estornado) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Lancamento ja foi estornado" });
      }

      // Criar lançamento de estorno (inverter débito/crédito)
      const estorno = await prisma.lancamento.create({
        data: {
          data: new Date(),
          descricao: `Estorno: ${lancamento.descricao}`,
          tipo: lancamento.tipo,
          recorrente: lancamento.recorrente,
          estornoDeId: lancamento.id,
          userId: ctx.user.id,
          linhas: {
            create: lancamento.linhas.map((l) => ({
              contaDebitoId: l.contaCreditoId, // Invertido
              contaCreditoId: l.contaDebitoId, // Invertido
              valor: l.valor,
              historico: `Estorno: ${l.historico || ""}`,
            })),
          },
        },
      });

      // Marcar original como estornado
      await prisma.lancamento.update({
        where: { id: input.id },
        data: { estornado: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ESTORNAR",
        entidade: "LANCAMENTO",
        entidadeId: input.id,
        detalhes: { estornoId: estorno.id },
      });

      return estorno;
    }),

  // =========================================
  // DESPESAS RECORRENTES
  // =========================================

  // Listar despesas recorrentes
  listDespesasRecorrentes: adminProcedure.query(async () => {
    const despesas = await prisma.despesaRecorrente.findMany({
      orderBy: { nome: "asc" },
      include: {
        contaContabil: {
          select: { id: true, codigo: true, nome: true },
        },
      },
    });
    return despesas;
  }),

  // Criar despesa recorrente
  createDespesaRecorrente: adminProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome obrigatorio"),
        valor: z.number().positive("Valor deve ser positivo"),
        contaContabilId: z.string().cuid("Conta contabil obrigatoria"),
        diaReconhecimento: z.number().int().min(1).max(31).default(31),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const despesa = await prisma.despesaRecorrente.create({
        data: {
          nome: input.nome,
          valor: input.valor,
          contaContabilId: input.contaContabilId,
          diaReconhecimento: input.diaReconhecimento,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "DESPESA_RECORRENTE",
        entidadeId: despesa.id,
        detalhes: { nome: despesa.nome, valor: Number(despesa.valor) },
      });

      return despesa;
    }),

  // Editar despesa recorrente
  updateDespesaRecorrente: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        nome: z.string().min(1).optional(),
        valor: z.number().positive().optional(),
        contaContabilId: z.string().cuid().optional(),
        status: z.enum(["ATIVA", "INATIVA"]).optional(),
        diaReconhecimento: z.number().int().min(1).max(31).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const despesa = await prisma.despesaRecorrente.findUnique({
        where: { id: input.id },
      });

      if (!despesa) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Despesa recorrente nao encontrada" });
      }

      const { id, ...updateData } = input;
      const atualizada = await prisma.despesaRecorrente.update({
        where: { id },
        data: updateData,
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "DESPESA_RECORRENTE",
        entidadeId: id,
        detalhes: { campos: Object.keys(updateData) },
      });

      return atualizada;
    }),

  // Excluir despesa recorrente
  deleteDespesaRecorrente: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const despesa = await prisma.despesaRecorrente.findUnique({
        where: { id: input.id },
      });

      if (!despesa) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Despesa recorrente nao encontrada" });
      }

      await prisma.despesaRecorrente.delete({ where: { id: input.id } });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EXCLUIR",
        entidade: "DESPESA_RECORRENTE",
        entidadeId: input.id,
        detalhes: { nome: despesa.nome },
      });

      return { success: true };
    }),

  // Executar despesas recorrentes para um mês (lançar automaticamente)
  executarDespesasRecorrentes: adminProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2024),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Buscar despesas ativas
      const despesas = await prisma.despesaRecorrente.findMany({
        where: { status: "ATIVA" },
        include: { contaContabil: true },
      });

      if (despesas.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nenhuma despesa recorrente ativa encontrada",
        });
      }

      // Data do lançamento: último dia do mês
      const ultimoDia = new Date(input.ano, input.mes, 0);

      // Verificar se já foram executadas para este mês
      const jaExecutadas = await prisma.lancamento.count({
        where: {
          tipo: "AUTOMATICO_DESPESA_RECORRENTE",
          data: {
            gte: new Date(input.ano, input.mes - 1, 1),
            lte: ultimoDia,
          },
          estornado: false,
          estornoDeId: null,
        },
      });

      if (jaExecutadas > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Ja existem ${jaExecutadas} lancamentos de despesas recorrentes para ${input.mes}/${input.ano}. Estorne-os primeiro se necessario.`,
        });
      }

      // Buscar conta Nubank (default para saídas)
      const contaNubank = await prisma.contaContabil.findUnique({
        where: { codigo: "1.1.1.01" },
      });

      if (!contaNubank) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Conta Nubank (1.1.1.01) nao encontrada no plano de contas",
        });
      }

      // Criar lançamentos
      const lancamentos = [];
      for (const despesa of despesas) {
        const lancamento = await prisma.lancamento.create({
          data: {
            data: ultimoDia,
            descricao: `Despesa recorrente: ${despesa.nome} — ${input.mes}/${input.ano}`,
            tipo: "AUTOMATICO_DESPESA_RECORRENTE",
            recorrente: true,
            despesaRecorrenteId: despesa.id,
            userId: ctx.user.id,
            linhas: {
              create: {
                contaDebitoId: despesa.contaContabilId, // Despesa (devedora)
                contaCreditoId: contaNubank.id, // Saída do caixa
                valor: despesa.valor,
                historico: `${despesa.nome} — ${input.mes}/${input.ano}`,
              },
            },
          },
        });
        lancamentos.push(lancamento);
      }

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EXECUTAR_DESPESAS_RECORRENTES",
        entidade: "LANCAMENTO",
        detalhes: {
          mes: input.mes,
          ano: input.ano,
          quantidade: lancamentos.length,
        },
      });

      return {
        success: true,
        quantidade: lancamentos.length,
        lancamentos,
      };
    }),

  // =========================================
  // TRANSFERÊNCIAS BANCÁRIAS
  // =========================================

  // Listar transferências
  listTransferencias: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [transferencias, total] = await Promise.all([
        prisma.transferenciaBancaria.findMany({
          skip,
          take: limit,
          orderBy: { data: "desc" },
          include: {
            contaOrigem: {
              select: { nome: true, banco: true },
            },
            contaDestino: {
              select: { nome: true, banco: true },
            },
          },
        }),
        prisma.transferenciaBancaria.count(),
      ]);

      return { transferencias, total, pages: Math.ceil(total / limit), page };
    }),

  // Registrar transferência bancária
  createTransferencia: adminProcedure
    .input(
      z.object({
        contaOrigemId: z.string().cuid(),
        contaDestinoId: z.string().cuid(),
        valor: z.number().positive("Valor deve ser positivo"),
        data: z.coerce.date(),
        descricao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.contaOrigemId === input.contaDestinoId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Conta origem e destino devem ser diferentes",
        });
      }

      // Buscar contas bancárias com contaContabil
      const [contaOrigem, contaDestino] = await Promise.all([
        prisma.contaBancaria.findUnique({
          where: { id: input.contaOrigemId },
          include: { contaContabil: true },
        }),
        prisma.contaBancaria.findUnique({
          where: { id: input.contaDestinoId },
          include: { contaContabil: true },
        }),
      ]);

      if (!contaOrigem || !contaDestino) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta bancaria nao encontrada" });
      }

      // Criar lançamento contábil (débito destino, crédito origem — sem impacto DRE)
      const lancamento = await prisma.lancamento.create({
        data: {
          data: input.data,
          descricao: input.descricao || `Transferencia ${contaOrigem.nome} → ${contaDestino.nome}`,
          tipo: "TRANSFERENCIA",
          recorrente: true,
          userId: ctx.user.id,
          linhas: {
            create: {
              contaDebitoId: contaDestino.contaContabilId,
              contaCreditoId: contaOrigem.contaContabilId,
              valor: input.valor,
              historico: `Transferencia ${contaOrigem.banco} → ${contaDestino.banco}`,
            },
          },
        },
      });

      // Criar registro da transferência
      const transferencia = await prisma.transferenciaBancaria.create({
        data: {
          contaOrigemId: input.contaOrigemId,
          contaDestinoId: input.contaDestinoId,
          valor: input.valor,
          data: input.data,
          descricao: input.descricao,
          lancamentoId: lancamento.id,
          userId: ctx.user.id,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "TRANSFERENCIA_BANCARIA",
        entidadeId: transferencia.id,
        detalhes: {
          origem: contaOrigem.nome,
          destino: contaDestino.nome,
          valor: input.valor,
        },
      });

      return transferencia;
    }),

  // =========================================
  // DISTRIBUIÇÃO DE LUCROS
  // =========================================

  // Listar distribuições
  listDistribuicoes: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
        socio: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, socio } = input;
      const skip = (page - 1) * limit;

      const where = socio ? { socio } : {};

      const [distribuicoes, total] = await Promise.all([
        prisma.distribuicaoLucros.findMany({
          where,
          skip,
          take: limit,
          orderBy: { data: "desc" },
          include: {
            contaBancaria: {
              select: { nome: true, banco: true },
            },
          },
        }),
        prisma.distribuicaoLucros.count({ where }),
      ]);

      // Totais por sócio
      const totaisPorSocio = await prisma.distribuicaoLucros.groupBy({
        by: ["socio"],
        _sum: { valor: true },
      });

      return {
        distribuicoes,
        total,
        pages: Math.ceil(total / limit),
        page,
        totaisPorSocio: totaisPorSocio.map((t) => ({
          socio: t.socio,
          total: Number(t._sum.valor || 0),
        })),
      };
    }),

  // Registrar distribuição de lucros
  createDistribuicao: adminProcedure
    .input(
      z.object({
        socio: z.string().min(1, "Socio obrigatorio"),
        valor: z.number().positive("Valor deve ser positivo"),
        data: z.coerce.date(),
        contaBancariaId: z.string().cuid("Conta bancaria obrigatoria"),
        descricao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const contaBancaria = await prisma.contaBancaria.findUnique({
        where: { id: input.contaBancariaId },
        include: { contaContabil: true },
      });

      if (!contaBancaria) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta bancaria nao encontrada" });
      }

      // Buscar conta de distribuição de lucros (2.3.3)
      const contaDistribuicao = await prisma.contaContabil.findUnique({
        where: { codigo: "2.3.3" },
      });

      if (!contaDistribuicao) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Conta Distribuicao de Lucros (2.3.3) nao encontrada",
        });
      }

      // Criar lançamento: Débito 2.3.3 (reduz PL), Crédito Caixa (saída)
      const lancamento = await prisma.lancamento.create({
        data: {
          data: input.data,
          descricao: input.descricao || `Distribuicao de lucros — ${input.socio}`,
          tipo: "DISTRIBUICAO_LUCROS",
          recorrente: true,
          userId: ctx.user.id,
          linhas: {
            create: {
              contaDebitoId: contaDistribuicao.id,
              contaCreditoId: contaBancaria.contaContabilId,
              valor: input.valor,
              historico: `Retirada ${input.socio}`,
            },
          },
        },
      });

      const distribuicao = await prisma.distribuicaoLucros.create({
        data: {
          socio: input.socio,
          valor: input.valor,
          data: input.data,
          contaBancariaId: input.contaBancariaId,
          lancamentoId: lancamento.id,
          descricao: input.descricao,
          userId: ctx.user.id,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "DISTRIBUICAO_LUCROS",
        entidadeId: distribuicao.id,
        detalhes: { socio: input.socio, valor: input.valor },
      });

      return distribuicao;
    }),

  // =========================================
  // DEMONSTRATIVOS FINANCEIROS
  // =========================================

  // DRE — Demonstração do Resultado do Exercício
  getDRE: adminProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2024),
      })
    )
    .query(async ({ input }) => {
      return gerarDRE(input.mes, input.ano);
    }),

  // Balanço Patrimonial
  getBalanco: adminProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2024),
      })
    )
    .query(async ({ input }) => {
      return gerarBalanco(input.mes, input.ano);
    }),

  // DFC — Fluxo de Caixa (Método Indireto)
  getDFC: adminProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2024),
      })
    )
    .query(async ({ input }) => {
      return gerarDFC(input.mes, input.ano);
    }),

  // =========================================
  // ANTECIPAÇÃO DE RECEBÍVEIS
  // =========================================

  // Listar recebíveis disponíveis para antecipação
  listRecebiveisParaAntecipar: adminProcedure.query(async () => {
    // Buscar vendas com pagamento em cartão (não canceladas) que ainda têm saldo a receber
    const vendas = await prisma.venda.findMany({
      where: {
        cancelada: false,
        formaPagamento: { in: ["CREDITO_VISTA", "CREDITO_PARCELADO"] },
        statusPagamento: { in: ["NAO_PAGO", "PARCIAL"] },
      },
      include: {
        peca: { select: { sku: true, marca: true, modelo: true } },
        cliente: { select: { nome: true } },
        pagamentos: { select: { valor: true } },
      },
      orderBy: { dataVenda: "desc" },
    });

    // Calcular saldo pendente de cada venda
    return vendas.map((v) => {
      const totalPago = v.pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
      const saldoPendente = Number(v.valorFinal) - totalPago;
      return {
        vendaId: v.id,
        sku: v.peca.sku,
        marca: v.peca.marca,
        modelo: v.peca.modelo,
        cliente: v.cliente.nome,
        dataVenda: v.dataVenda,
        valorFinal: Number(v.valorFinal),
        totalPago,
        saldoPendente,
        formaPagamento: v.formaPagamento,
        parcelas: v.parcelas,
      };
    }).filter((v) => v.saldoPendente > 0.01);
  }),

  // Listar antecipações registradas
  listAntecipacoes: adminProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [antecipacoes, total] = await Promise.all([
        prisma.antecipacaoRecebivel.findMany({
          skip,
          take: limit,
          orderBy: { data: "desc" },
          include: {
            contaBancaria: { select: { nome: true } },
            vendas: {
              select: {
                vendaId: true,
                valorAntecipado: true,
              },
            },
          },
        }),
        prisma.antecipacaoRecebivel.count(),
      ]);

      return { antecipacoes, total, pages: Math.ceil(total / limit), page };
    }),

  // Registrar antecipação de recebíveis
  createAntecipacao: adminProcedure
    .input(
      z.object({
        vendaIds: z.array(z.string().cuid()).min(1, "Selecione pelo menos uma venda"),
        taxaAntecipacao: z.number().positive("Taxa deve ser positiva").max(100),
        contaBancariaId: z.string().cuid("Conta bancaria obrigatoria"),
        data: z.coerce.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Buscar vendas selecionadas
      const vendas = await prisma.venda.findMany({
        where: {
          id: { in: input.vendaIds },
          cancelada: false,
        },
        include: { pagamentos: true },
      });

      if (vendas.length !== input.vendaIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Algumas vendas nao foram encontradas" });
      }

      // Calcular valores
      let valorBruto = 0;
      const vendasParaAntecipar: { vendaId: string; saldo: number }[] = [];

      for (const venda of vendas) {
        const totalPago = venda.pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
        const saldo = Number(venda.valorFinal) - totalPago;
        if (saldo > 0.01) {
          valorBruto += saldo;
          vendasParaAntecipar.push({ vendaId: venda.id, saldo });
        }
      }

      const valorTaxa = Math.round(valorBruto * (input.taxaAntecipacao / 100) * 100) / 100;
      const valorLiquido = Math.round((valorBruto - valorTaxa) * 100) / 100;

      // Buscar conta bancária
      const contaBancaria = await prisma.contaBancaria.findUnique({
        where: { id: input.contaBancariaId },
        include: { contaContabil: true },
      });

      if (!contaBancaria) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conta bancaria nao encontrada" });
      }

      // Buscar contas do plano de contas
      const [contaReceber, contaTaxa] = await Promise.all([
        prisma.contaContabil.findUnique({ where: { codigo: "1.1.2.01" } }),
        prisma.contaContabil.findUnique({ where: { codigo: "4.3.1" } }),
      ]);

      if (!contaReceber || !contaTaxa) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contas contabeis para antecipacao nao encontradas",
        });
      }

      // Criar lançamentos contábeis:
      // 1. Entrada do valor líquido no caixa: D Caixa, C Contas a Receber
      // 2. Taxa de antecipação: D 4.3.1, C Contas a Receber
      const lancamento = await prisma.lancamento.create({
        data: {
          data: input.data,
          descricao: `Antecipação de ${vendasParaAntecipar.length} recebíveis — taxa ${input.taxaAntecipacao}%`,
          tipo: "ANTECIPACAO",
          recorrente: true,
          userId: ctx.user.id,
          linhas: {
            create: [
              {
                contaDebitoId: contaBancaria.contaContabilId,
                contaCreditoId: contaReceber.id,
                valor: valorLiquido,
                historico: `Antecipação — valor líquido`,
              },
              {
                contaDebitoId: contaTaxa.id,
                contaCreditoId: contaReceber.id,
                valor: valorTaxa,
                historico: `Taxa antecipação ${input.taxaAntecipacao}%`,
              },
            ],
          },
        },
      });

      // Criar registro da antecipação
      const antecipacao = await prisma.antecipacaoRecebivel.create({
        data: {
          data: input.data,
          valorBruto,
          taxaAntecipacao: input.taxaAntecipacao,
          valorTaxa,
          valorLiquido,
          contaBancariaId: input.contaBancariaId,
          lancamentoId: lancamento.id,
          userId: ctx.user.id,
          vendas: {
            create: vendasParaAntecipar.map((v) => ({
              vendaId: v.vendaId,
              valorAntecipado: v.saldo,
            })),
          },
        },
      });

      // Registrar pagamentos nas vendas (marcar como pagas)
      for (const v of vendasParaAntecipar) {
        await prisma.pagamento.create({
          data: {
            vendaId: v.vendaId,
            valor: v.saldo,
          },
        });

        await prisma.venda.update({
          where: { id: v.vendaId },
          data: { statusPagamento: "PAGO" },
        });
      }

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "ANTECIPACAO_RECEBIVEL",
        entidadeId: antecipacao.id,
        detalhes: {
          valorBruto,
          taxa: input.taxaAntecipacao,
          valorLiquido,
          vendas: vendasParaAntecipar.length,
        },
      });

      return antecipacao;
    }),

  // =========================================
  // BACKFILL DE LANÇAMENTOS
  // =========================================

  // Backfill vendas — gera lançamentos contábeis para vendas que não possuem
  backfillVendas: adminProcedure.mutation(async ({ ctx }) => {
    // Buscar IDs de vendas que JÁ têm lançamentos contábeis
    const vendasComLancamento = await prisma.lancamento.findMany({
      where: {
        vendaId: { not: null },
        tipo: "AUTOMATICO_VENDA",
        estornado: false,
        estornoDeId: null,
      },
      select: { vendaId: true },
      distinct: ["vendaId"],
    });
    const idsComLancamento = vendasComLancamento
      .map((l) => l.vendaId)
      .filter((id): id is string => id !== null);

    // Buscar vendas não-canceladas que NÃO têm lançamentos contábeis
    const vendasSemLancamento = await prisma.venda.findMany({
      where: {
        cancelada: false,
        ...(idsComLancamento.length > 0 && { id: { notIn: idsComLancamento } }),
      },
      include: {
        peca: {
          select: {
            sku: true,
            origemTipo: true,
            origemCanal: true,
            valorCompra: true,
            custoManutencao: true,
          },
        },
      },
      orderBy: { dataVenda: "asc" },
    });

    if (vendasSemLancamento.length === 0) {
      return { processadas: 0, erros: 0, detalhesErros: [] as string[] };
    }

    let processadas = 0;
    const detalhesErros: string[] = [];

    for (const venda of vendasSemLancamento) {
      try {
        await criarLancamentosVenda(
          {
            id: venda.id,
            valorFinal: Number(venda.valorFinal),
            formaPagamento: venda.formaPagamento,
            taxaMDR: Number(venda.taxaMDR),
            valorRepasseDevido: venda.valorRepasseDevido
              ? Number(venda.valorRepasseDevido)
              : null,
            dataVenda: venda.dataVenda,
            peca: {
              sku: venda.peca.sku,
              origemTipo: venda.peca.origemTipo,
              origemCanal: venda.peca.origemCanal,
              valorCompra: Number(venda.peca.valorCompra),
              custoManutencao: venda.peca.custoManutencao
                ? Number(venda.peca.custoManutencao)
                : null,
            },
          },
          ctx.user.id
        );
        processadas++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        detalhesErros.push(`${venda.peca.sku}: ${msg}`);
      }
    }

    await registrarAuditoria({
      userId: ctx.user.id,
      acao: "BACKFILL_VENDAS",
      entidade: "LANCAMENTO",
      detalhes: { processadas, erros: detalhesErros.length },
    });

    return { processadas, erros: detalhesErros.length, detalhesErros };
  }),

  // Corrigir valorDeclarar de todas as vendas (consignação: margem; compra: valorFinal)
  corrigirValorDeclarar: adminProcedure.mutation(async ({ ctx }) => {
    // Buscar TODAS as vendas não-canceladas
    const vendas = await prisma.venda.findMany({
      where: { cancelada: false },
      select: {
        id: true,
        valorFinal: true,
        valorRepasseDevido: true,
        valorDeclarar: true,
        peca: { select: { origemTipo: true } },
      },
    });

    let corrigidas = 0;
    for (const venda of vendas) {
      const valorFinal = Number(venda.valorFinal);
      const repasse = venda.valorRepasseDevido ? Number(venda.valorRepasseDevido) : 0;
      const isConsignacao = venda.peca.origemTipo === "CONSIGNACAO" && repasse > 0;

      // Consignação: margem; Compra: valorFinal
      const valorCorreto = isConsignacao ? valorFinal - repasse : valorFinal;
      const declaraAtual = venda.valorDeclarar ? Number(venda.valorDeclarar) : 0;

      // Atualizar se NULL ou diferente do correto
      if (!venda.valorDeclarar || Math.abs(declaraAtual - valorCorreto) > 0.01) {
        await prisma.venda.update({
          where: { id: venda.id },
          data: { valorDeclarar: valorCorreto },
        });
        corrigidas++;
      }
    }

    await registrarAuditoria({
      userId: ctx.user.id,
      acao: "CORRECAO_VALOR_DECLARAR",
      entidade: "VENDA",
      detalhes: { totalVendas: vendas.length, corrigidas },
    });

    return { totalVendas: vendas.length, corrigidas };
  }),

  // Reparar lançamentos contábeis com valores divergentes
  repararLancamentos: adminProcedure.mutation(async ({ ctx }) => {
    // Buscar contas de receita para comparar valores
    const contaReceita311 = await prisma.contaContabil.findUnique({ where: { codigo: "3.1.1" } });
    const contaReceita312 = await prisma.contaContabil.findUnique({ where: { codigo: "3.1.2" } });
    if (!contaReceita311 || !contaReceita312) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Contas de receita não encontradas" });
    }

    // Buscar todas as vendas não-canceladas que têm lançamentos
    const vendas = await prisma.venda.findMany({
      where: { cancelada: false },
      include: {
        peca: {
          select: { sku: true, origemTipo: true, origemCanal: true, valorCompra: true, custoManutencao: true },
        },
      },
    });

    let reparadas = 0;
    const detalhes: string[] = [];

    for (const venda of vendas) {
      // Buscar lançamento de receita atual (não estornado) que credita 3.1.1 ou 3.1.2
      const isConsignacao = venda.peca.origemTipo === "CONSIGNACAO";
      const contaReceitaId = isConsignacao ? contaReceita312.id : contaReceita311.id;

      const lancamentoReceita = await prisma.linhaLancamento.findFirst({
        where: {
          contaCreditoId: contaReceitaId,
          lancamento: {
            vendaId: venda.id,
            tipo: "AUTOMATICO_VENDA",
            estornado: false,
            estornoDeId: null,
          },
        },
        select: { valor: true },
      });

      if (!lancamentoReceita) continue; // sem lançamento, backfill cuida disso

      // Calcular valor esperado
      const valorFinal = Number(venda.valorFinal);
      const repasse = venda.valorRepasseDevido ? Number(venda.valorRepasseDevido) : 0;
      const valorEsperado = isConsignacao && repasse > 0
        ? valorFinal - repasse  // margem
        : valorFinal;           // receita bruta total

      const valorAtual = Number(lancamentoReceita.valor);

      // Se o valor diverge, estornar tudo e recriar
      if (Math.abs(valorAtual - valorEsperado) > 0.01) {
        await reverterLancamentosVenda(venda.id, ctx.user.id);
        await criarLancamentosVenda(
          {
            id: venda.id,
            valorFinal,
            formaPagamento: venda.formaPagamento,
            taxaMDR: Number(venda.taxaMDR),
            valorRepasseDevido: repasse > 0 ? repasse : null,
            dataVenda: venda.dataVenda,
            peca: {
              sku: venda.peca.sku,
              origemTipo: venda.peca.origemTipo,
              origemCanal: venda.peca.origemCanal,
              valorCompra: Number(venda.peca.valorCompra),
              custoManutencao: venda.peca.custoManutencao ? Number(venda.peca.custoManutencao) : null,
            },
          },
          ctx.user.id
        );
        reparadas++;
        detalhes.push(`${venda.peca.sku}: receita ${valorAtual.toFixed(2)} → ${valorEsperado.toFixed(2)}`);
      }
    }

    await registrarAuditoria({
      userId: ctx.user.id,
      acao: "REPARAR_LANCAMENTOS",
      entidade: "LANCAMENTO",
      detalhes: { reparadas, detalhes },
    });

    return { reparadas, detalhes };
  }),

  // Backfill despesas recorrentes — executa para múltiplos meses
  backfillDespesas: adminProcedure
    .input(
      z.object({
        mesInicio: z.number().int().min(1).max(12),
        anoInicio: z.number().int().min(2024),
        mesFim: z.number().int().min(1).max(12),
        anoFim: z.number().int().min(2024),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const despesas = await prisma.despesaRecorrente.findMany({
        where: { status: "ATIVA" },
        include: { contaContabil: true },
      });

      if (despesas.length === 0) {
        return { mesesProcessados: 0, mesesPulados: 0, totalLancamentos: 0 };
      }

      const contaNubank = await prisma.contaContabil.findUnique({
        where: { codigo: "1.1.1.01" },
      });

      if (!contaNubank) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Conta Nubank (1.1.1.01) nao encontrada no plano de contas",
        });
      }

      let mesesProcessados = 0;
      let mesesPulados = 0;
      let totalLancamentos = 0;

      // Iterar por cada mês no range
      let ano = input.anoInicio;
      let mes = input.mesInicio;

      while (ano < input.anoFim || (ano === input.anoFim && mes <= input.mesFim)) {
        const primeiroDia = new Date(ano, mes - 1, 1);
        const ultimoDia = new Date(ano, mes, 0);

        // Verificar se já existem lançamentos para este mês
        const jaExecutadas = await prisma.lancamento.count({
          where: {
            tipo: "AUTOMATICO_DESPESA_RECORRENTE",
            data: { gte: primeiroDia, lte: ultimoDia },
            estornado: false,
            estornoDeId: null,
          },
        });

        if (jaExecutadas > 0) {
          mesesPulados++;
        } else {
          // Criar lançamentos para este mês
          for (const despesa of despesas) {
            await prisma.lancamento.create({
              data: {
                data: ultimoDia,
                descricao: `Despesa recorrente: ${despesa.nome} — ${mes}/${ano}`,
                tipo: "AUTOMATICO_DESPESA_RECORRENTE",
                recorrente: true,
                despesaRecorrenteId: despesa.id,
                userId: ctx.user.id,
                linhas: {
                  create: {
                    contaDebitoId: despesa.contaContabilId,
                    contaCreditoId: contaNubank.id,
                    valor: despesa.valor,
                    historico: `${despesa.nome} — ${mes}/${ano}`,
                  },
                },
              },
            });
            totalLancamentos++;
          }
          mesesProcessados++;
        }

        // Avançar para o próximo mês
        mes++;
        if (mes > 12) {
          mes = 1;
          ano++;
        }
      }

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "BACKFILL_DESPESAS",
        entidade: "LANCAMENTO",
        detalhes: { mesesProcessados, mesesPulados, totalLancamentos },
      });

      return { mesesProcessados, mesesPulados, totalLancamentos };
    }),

  // =========================================
  // DASHBOARD FINANCEIRO
  // =========================================

  getDashboard: adminProcedure.query(async () => {
    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();

    // Saldos de caixa
    const contasBancarias = await prisma.contaBancaria.findMany({
      where: { ativa: true },
      include: {
        contaContabil: { select: { id: true, codigo: true, nome: true } },
      },
    });

    // Calcular saldos de caixa por conta
    const saldosCaixa = await Promise.all(
      contasBancarias.map(async (cb) => {
        const debitos = await prisma.linhaLancamento.aggregate({
          where: {
            contaDebitoId: cb.contaContabil.id,
            lancamento: { estornado: false, estornoDeId: null },
          },
          _sum: { valor: true },
        });
        const creditos = await prisma.linhaLancamento.aggregate({
          where: {
            contaCreditoId: cb.contaContabil.id,
            lancamento: { estornado: false, estornoDeId: null },
          },
          _sum: { valor: true },
        });

        const saldo = Number(cb.saldoInicial) +
          Number(debitos._sum.valor || 0) -
          Number(creditos._sum.valor || 0);

        return {
          nome: cb.nome,
          banco: cb.banco,
          saldo,
        };
      })
    );

    const saldoTotalCaixa = saldosCaixa.reduce((acc, s) => acc + s.saldo, 0);

    // DRE do mês atual (resumo)
    let dreMesAtual;
    try {
      dreMesAtual = await gerarDRE(mesAtual, anoAtual);
    } catch {
      dreMesAtual = null;
    }

    // Recebíveis pendentes
    const recebiveis = await prisma.venda.findMany({
      where: {
        cancelada: false,
        statusPagamento: { in: ["NAO_PAGO", "PARCIAL"] },
      },
      include: { pagamentos: { select: { valor: true } } },
    });

    const totalRecebiveis = recebiveis.reduce((acc, v) => {
      const pago = v.pagamentos.reduce((a, p) => a + Number(p.valor), 0);
      return acc + (Number(v.valorFinal) - pago);
    }, 0);

    // Repasses pendentes
    const repassesPendentes = await prisma.venda.aggregate({
      where: {
        cancelada: false,
        statusRepasse: { in: ["PENDENTE", "PARCIAL"] },
      },
      _sum: { valorRepasseDevido: true, valorRepasseFeito: true },
    });

    const totalRepassesPendentes =
      Number(repassesPendentes._sum.valorRepasseDevido || 0) -
      Number(repassesPendentes._sum.valorRepasseFeito || 0);

    // Simples Nacional atual — respeitar taxa manual se configurada
    const rbt12 = await calcularRBT12();
    const configAliquota = await prisma.configuracao.findUnique({
      where: { chave: "ALIQUOTA_SIMPLES" },
    });
    const aliquotaConfig = configAliquota?.valor || "auto";
    const aliquotaModo: "auto" | "manual" = aliquotaConfig === "auto" ? "auto" : "manual";
    const aliquotaSimples = aliquotaModo === "manual"
      ? parseFloat(aliquotaConfig) / 100
      : calcularAliquotaEfetiva(rbt12);

    // Evolução mensal (últimos 6 meses)
    const evolucao = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(anoAtual, mesAtual - 1 - i, 1);
      const mesEv = m.getMonth() + 1;
      const anoEv = m.getFullYear();

      try {
        const dre = await gerarDRE(mesEv, anoEv);
        evolucao.push({
          mes: mesEv,
          ano: anoEv,
          label: `${mesEv.toString().padStart(2, "0")}/${anoEv}`,
          receitaLiquida: dre.resumo.receitaLiquida,
          lucroLiquido: dre.resumo.lucroLiquido,
        });
      } catch {
        evolucao.push({
          mes: mesEv,
          ano: anoEv,
          label: `${mesEv.toString().padStart(2, "0")}/${anoEv}`,
          receitaLiquida: 0,
          lucroLiquido: 0,
        });
      }
    }

    return {
      saldosCaixa,
      saldoTotalCaixa,
      dreMesAtual: dreMesAtual?.resumo ?? null,
      totalRecebiveis,
      totalRepassesPendentes,
      vendasPendentes: recebiveis.length,
      rbt12,
      aliquotaSimples,
      aliquotaModo,
      evolucao,
    };
  }),

  // =========================================
  // RECALCULAR SIMPLES NACIONAL
  // =========================================
  recalcularSimples: adminProcedure
    .input(
      z.object({
        novaAliquota: z.string(), // "auto" ou número (ex: "6")
      })
    )
    .mutation(async ({ input }) => {
      const { novaAliquota } = input;

      // Buscar todos os lançamentos de Simples Nacional (não estornados)
      const lancamentosSimples = await prisma.lancamento.findMany({
        where: {
          descricao: { startsWith: "Simples Nacional" },
          tipo: "AUTOMATICO_VENDA",
          estornado: false,
          estornoDeId: null,
          vendaId: { not: null },
        },
        include: {
          linhas: true,
        },
      });

      if (lancamentosSimples.length === 0) {
        return { atualizados: 0 };
      }

      // Buscar todas as vendas relacionadas de uma vez
      const vendaIds = lancamentosSimples.map((l) => l.vendaId!).filter(Boolean);
      const vendas = await prisma.venda.findMany({
        where: { id: { in: vendaIds } },
        include: { peca: { select: { sku: true, origemTipo: true } } },
      });
      const vendasMap = new Map(vendas.map((v) => [v.id, v]));

      let atualizados = 0;

      for (const lanc of lancamentosSimples) {
        const venda = vendasMap.get(lanc.vendaId!) as any;
        if (!venda) continue;

        const isConsignacao = venda.peca?.origemTipo === "CONSIGNACAO";
        const valorFinal = Number(venda.valorFinal);
        const valorRepasse = Number(venda.valorRepasseDevido || 0);
        const margem = valorFinal - valorRepasse;
        const baseSimples = isConsignacao ? margem : valorFinal;

        if (baseSimples <= 0) continue;

        let aliquotaEfetiva: number;
        let valorImposto: number;
        let historicoExtra: string;

        if (novaAliquota !== "auto") {
          // Alíquota fixa
          aliquotaEfetiva = parseFloat(novaAliquota) / 100;
          valorImposto = Math.round(baseSimples * aliquotaEfetiva * 100) / 100;
          historicoExtra = `alíquota fixa ${(aliquotaEfetiva * 100).toFixed(2)}%`;
        } else {
          // Cálculo automático via RBT12
          const rbt12Val = await calcularRBT12(venda.dataVenda);
          const resultado = calcularAliquotaEfetiva(rbt12Val);
          aliquotaEfetiva = resultado;
          valorImposto = Math.round(baseSimples * aliquotaEfetiva * 100) / 100;
          historicoExtra = `RBT12: R$${rbt12Val.toFixed(2)}`;
        }

        // Atualizar descrição do lançamento
        const novaDescricao = `Simples Nacional ${(aliquotaEfetiva * 100).toFixed(2)}% — ${venda.peca?.sku || ""}`;

        // Atualizar o lançamento e sua linha
        await prisma.lancamento.update({
          where: { id: lanc.id },
          data: { descricao: novaDescricao },
        });

        // Atualizar valor da linha
        if (lanc.linhas.length > 0) {
          await prisma.linhaLancamento.update({
            where: { id: lanc.linhas[0]!.id },
            data: {
              valor: valorImposto,
              historico: `Simples Nacional ${(aliquotaEfetiva * 100).toFixed(2)}% sobre R$${baseSimples.toFixed(2)} (${historicoExtra})`,
            },
          });
        }

        atualizados++;
      }

      return { atualizados };
    }),
});
