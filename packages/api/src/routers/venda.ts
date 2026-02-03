import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, socioOuAdminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";
import { criarAlertaRepassePendente } from "../services/alerta.service";
import { gerarSKUDevolucao } from "../services/sku.service";

// Schemas
const VendaCreateSchema = z.object({
  pecaId: z.string().cuid("Peca invalida"),
  clienteId: z.string().cuid("Cliente invalido"),
  valorDesconto: z.number().min(0).optional(),
  formaPagamento: z.enum(["PIX", "CREDITO_VISTA", "CREDITO_PARCELADO"]),
  parcelas: z.number().int().min(1).max(12).optional(),
  pagamentoInicial: z.number().min(0).optional(),
  observacaoLogistica: z.string().optional(),
});

const VendaListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  statusPagamento: z.enum(["PAGO", "PARCIAL", "NAO_PAGO"]).optional(),
  statusRepasse: z.enum(["FEITO", "PARCIAL", "PENDENTE"]).optional(),
  cancelada: z.boolean().default(false),
  clienteId: z.string().cuid().optional(),
});

const PagamentoSchema = z.object({
  vendaId: z.string().cuid(),
  valor: z.number().positive("Valor deve ser positivo"),
});

const RepasseSchema = z.object({
  vendaId: z.string().cuid(),
  valor: z.number().positive("Valor deve ser positivo"),
});

export const vendaRouter = router({
  // Listar vendas
  list: protectedProcedure
    .input(VendaListSchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, search, statusPagamento, statusRepasse, cancelada, clienteId } = input;
      const skip = (page - 1) * limit;

      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

      const where = {
        cancelada,
        ...(statusPagamento && { statusPagamento }),
        ...(statusRepasse && { statusRepasse }),
        ...(clienteId && { clienteId }),
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

      const vendasFormatadas = vendas.map((v) => ({
        ...v,
        valorOriginal: podeVerValores ? v.valorOriginal : null,
        valorDesconto: podeVerValores ? v.valorDesconto : null,
        valorFinal: podeVerValores ? v.valorFinal : null,
        valorRepasseDevido: podeVerValores ? v.valorRepasseDevido : null,
        valorRepasseFeito: podeVerValores ? v.valorRepasseFeito : null,
      }));

      return {
        vendas: vendasFormatadas,
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

      const venda = await prisma.venda.findUnique({
        where: { id: input.id },
        include: {
          peca: {
            include: {
              fotos: { take: 1 },
              fornecedor: { select: { nome: true } },
            },
          },
          cliente: true,
          pagamentos: {
            orderBy: { data: "desc" },
          },
        },
      });

      if (!venda) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venda nao encontrada",
        });
      }

      // Calcular total pago
      const totalPago = venda.pagamentos.reduce(
        (acc, p) => acc + Number(p.valor),
        0
      );

      return {
        ...venda,
        valorOriginal: podeVerValores ? venda.valorOriginal : null,
        valorDesconto: podeVerValores ? venda.valorDesconto : null,
        valorFinal: podeVerValores ? venda.valorFinal : null,
        valorRepasseDevido: podeVerValores ? venda.valorRepasseDevido : null,
        valorRepasseFeito: podeVerValores ? venda.valorRepasseFeito : null,
        pagamentos: podeVerValores
          ? venda.pagamentos
          : venda.pagamentos.map((p) => ({ ...p, valor: null })),
        _totalPago: podeVerValores ? totalPago : null,
        _saldoDevedor: podeVerValores
          ? Number(venda.valorFinal) - totalPago
          : null,
      };
    }),

  // Criar venda
  create: protectedProcedure
    .input(VendaCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. Validar peca
      const peca = await prisma.peca.findUnique({
        where: { id: input.pecaId },
        include: {
          fornecedor: { select: { nome: true } },
        },
      });

      if (!peca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Peca nao encontrada",
        });
      }

      // Permitir venda de peças DISPONIVEL, EM_TRANSITO ou REVISAO
      const statusPermitidos = ["DISPONIVEL", "EM_TRANSITO", "REVISAO"];
      if (!statusPermitidos.includes(peca.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Peca nao esta disponivel para venda (status: " + peca.status + ")",
        });
      }

      // 2. Validar cliente
      const cliente = await prisma.cliente.findUnique({
        where: { id: input.clienteId },
      });

      if (!cliente) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente nao encontrado",
        });
      }

      // 3. Buscar taxa MDR
      const configMDR = await prisma.configuracao.findUnique({
        where: { chave: "taxa_mdr" },
      });
      const taxaMDR = parseFloat(configMDR?.valor || "4");

      // 4. Calcular valores
      const valorOriginal = Number(peca.valorEstimadoVenda);
      const valorDesconto = input.valorDesconto || 0;
      const valorFinal = valorOriginal - valorDesconto;

      // 5. Calcular repasse (se consignacao)
      let valorRepasseDevido = null;
      let statusRepasse = null;

      if (peca.origemTipo === "CONSIGNACAO" && peca.valorRepasse) {
        valorRepasseDevido = Number(peca.valorRepasse);
        statusRepasse = "PENDENTE" as const;
      }

      // 6. Criar venda
      const venda = await prisma.venda.create({
        data: {
          pecaId: input.pecaId,
          clienteId: input.clienteId,
          valorOriginal,
          valorDesconto,
          valorFinal,
          formaPagamento: input.formaPagamento,
          parcelas: input.parcelas || null,
          taxaMDR,
          statusPagamento: "NAO_PAGO",
          valorRepasseDevido,
          valorRepasseFeito: valorRepasseDevido ? 0 : null,
          statusRepasse,
          observacaoLogistica: input.observacaoLogistica || null,
        },
      });

      // 7. Registrar pagamento inicial (se houver)
      if (input.pagamentoInicial && input.pagamentoInicial > 0) {
        await prisma.pagamento.create({
          data: {
            vendaId: venda.id,
            valor: input.pagamentoInicial,
          },
        });

        // Atualizar status de pagamento
        const novoStatus =
          input.pagamentoInicial >= valorFinal ? "PAGO" : "PARCIAL";

        await prisma.venda.update({
          where: { id: venda.id },
          data: { statusPagamento: novoStatus },
        });
      }

      // 8. Criar alerta de repasse (se consignacao)
      if (valorRepasseDevido) {
        await criarAlertaRepassePendente(
          venda.id,
          peca.fornecedor.nome,
          valorRepasseDevido
        );
      }

      // 9. Atualizar peca
      await prisma.peca.update({
        where: { id: input.pecaId },
        data: {
          status: "VENDIDA",
          localizacao: "Cliente Final",
          historicoStatus: {
            create: {
              statusAnterior: peca.status,
              statusNovo: "VENDIDA",
              localizacaoAnterior: peca.localizacao,
              localizacaoNova: "Cliente Final",
              userId: ctx.user.id,
            },
          },
        },
      });

      // 10. Registrar auditoria
      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "VENDA",
        entidadeId: venda.id,
        detalhes: {
          peca: peca.sku,
          cliente: cliente.nome,
          valorFinal,
        },
      });

      return venda;
    }),

  // Registrar pagamento
  registrarPagamento: protectedProcedure
    .input(PagamentoSchema)
    .mutation(async ({ input, ctx }) => {
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        include: { pagamentos: true },
      });

      if (!venda) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venda nao encontrada",
        });
      }

      if (venda.cancelada) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nao e possivel registrar pagamento em venda cancelada",
        });
      }

      // Calcular total ja pago
      const totalPago = venda.pagamentos.reduce(
        (acc, p) => acc + Number(p.valor),
        0
      );
      const saldoDevedor = Number(venda.valorFinal) - totalPago;

      if (input.valor > saldoDevedor) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Valor excede saldo devedor de R$ ${saldoDevedor.toFixed(2)}`,
        });
      }

      // Criar pagamento
      const pagamento = await prisma.pagamento.create({
        data: {
          vendaId: input.vendaId,
          valor: input.valor,
        },
      });

      // Atualizar status
      const novoTotalPago = totalPago + input.valor;
      const novoStatus =
        novoTotalPago >= Number(venda.valorFinal) ? "PAGO" : "PARCIAL";

      await prisma.venda.update({
        where: { id: input.vendaId },
        data: { statusPagamento: novoStatus },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "REGISTRAR_PAGAMENTO",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: { valor: input.valor },
      });

      return pagamento;
    }),

  // Registrar repasse
  registrarRepasse: socioOuAdminProcedure
    .input(RepasseSchema)
    .mutation(async ({ input, ctx }) => {
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
      });

      if (!venda) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venda nao encontrada",
        });
      }

      if (!venda.valorRepasseDevido) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta venda nao tem repasse pendente",
        });
      }

      const repasseFeito = Number(venda.valorRepasseFeito) || 0;
      const saldoRepasse = Number(venda.valorRepasseDevido) - repasseFeito;

      if (input.valor > saldoRepasse) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Valor excede saldo de repasse de R$ ${saldoRepasse.toFixed(2)}`,
        });
      }

      const novoRepasseFeito = repasseFeito + input.valor;
      const novoStatus =
        novoRepasseFeito >= Number(venda.valorRepasseDevido)
          ? "FEITO"
          : "PARCIAL";

      await prisma.venda.update({
        where: { id: input.vendaId },
        data: {
          valorRepasseFeito: novoRepasseFeito,
          statusRepasse: novoStatus,
          dataRepasse: novoStatus === "FEITO" ? new Date() : null,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "REGISTRAR_REPASSE",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: { valor: input.valor },
      });

      return { success: true };
    }),

  // Cancelar/devolver venda
  cancel: socioOuAdminProcedure
    .input(z.object({ vendaId: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const venda = await prisma.venda.findUnique({
        where: { id: input.vendaId },
        include: {
          peca: true,
        },
      });

      if (!venda) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venda nao encontrada",
        });
      }

      if (venda.cancelada) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Venda ja foi cancelada",
        });
      }

      // Marcar venda como cancelada
      await prisma.venda.update({
        where: { id: input.vendaId },
        data: {
          cancelada: true,
          dataCancelamento: new Date(),
        },
      });

      // Criar nova peca com SKU derivado
      const novoSku = await gerarSKUDevolucao(venda.peca.skuBase);

      await prisma.peca.create({
        data: {
          sku: novoSku,
          skuBase: venda.peca.skuBase,
          numeroDevolucoes: venda.peca.numeroDevolucoes + 1,
          marca: venda.peca.marca,
          modelo: venda.peca.modelo,
          ano: venda.peca.ano,
          tamanhoCaixa: venda.peca.tamanhoCaixa,
          materialCaixa: venda.peca.materialCaixa,
          materialPulseira: venda.peca.materialPulseira,
          valorCompra: venda.peca.valorCompra,
          valorEstimadoVenda: venda.peca.valorEstimadoVenda,
          origemTipo: venda.peca.origemTipo,
          origemCanal: venda.peca.origemCanal,
          valorRepasse: venda.peca.valorRepasse,
          status: "DISPONIVEL",
          localizacao: "Rafael",
          fornecedorId: venda.peca.fornecedorId,
          historicoStatus: {
            create: {
              statusNovo: "DISPONIVEL",
              localizacaoNova: "Rafael",
              userId: ctx.user.id,
            },
          },
        },
      });

      // Incrementar contador de devolucoes na peca original
      await prisma.peca.update({
        where: { id: venda.pecaId },
        data: {
          numeroDevolucoes: { increment: 1 },
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CANCELAR",
        entidade: "VENDA",
        entidadeId: input.vendaId,
        detalhes: { novoSku },
      });

      return { success: true, novoSku };
    }),

  // Total a receber
  getRecebiveis: protectedProcedure.query(async ({ ctx }) => {
    const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

    if (!podeVerValores) {
      return null;
    }

    const vendas = await prisma.venda.findMany({
      where: {
        cancelada: false,
        statusPagamento: { in: ["NAO_PAGO", "PARCIAL"] },
      },
      include: { pagamentos: true },
    });

    const totalRecebiveis = vendas.reduce((acc, v) => {
      const totalPago = v.pagamentos.reduce((a, p) => a + Number(p.valor), 0);
      return acc + (Number(v.valorFinal) - totalPago);
    }, 0);

    const totalRepassesPendentes = await prisma.venda.aggregate({
      where: {
        cancelada: false,
        statusRepasse: { in: ["PENDENTE", "PARCIAL"] },
      },
      _sum: {
        valorRepasseDevido: true,
        valorRepasseFeito: true,
      },
    });

    const repassePendente =
      Number(totalRepassesPendentes._sum.valorRepasseDevido || 0) -
      Number(totalRepassesPendentes._sum.valorRepasseFeito || 0);

    return {
      totalRecebiveis,
      repassePendente,
      vendasPendentes: vendas.length,
    };
  }),

  // Metricas de vendas
  getMetricas: protectedProcedure.query(async ({ ctx }) => {
    const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

    // Vendas do mes atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [vendasMes, totalVendas] = await Promise.all([
      prisma.venda.count({
        where: {
          cancelada: false,
          dataVenda: { gte: inicioMes },
        },
      }),
      prisma.venda.count({
        where: { cancelada: false },
      }),
    ]);

    let faturamentoMes = null;
    if (podeVerValores) {
      const vendasValores = await prisma.venda.findMany({
        where: {
          cancelada: false,
          dataVenda: { gte: inicioMes },
        },
        select: { valorFinal: true, valorRepasseDevido: true },
      });

      // Calcular faturamento real:
      // - Compra: valorFinal (receita total)
      // - Consignacao: valorFinal - valorRepasseDevido (margem)
      faturamentoMes = vendasValores.reduce((acc, v) => {
        const valorFinal = Number(v.valorFinal) || 0;
        const valorRepasse = Number(v.valorRepasseDevido) || 0;
        return acc + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
      }, 0);
    }

    return {
      vendasMes,
      totalVendas,
      faturamentoMes,
    };
  }),
});
