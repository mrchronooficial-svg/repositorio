import { protectedProcedure, router } from "../index";
import prisma from "@gestaomrchrono/db";

export const dashboardRouter = router({
  // Metricas principais do dashboard
  getMetricas: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    const podeVerValores = userNivel === "ADMINISTRADOR" || userNivel === "SOCIO";

    // Datas para filtros
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

    // Configuracoes
    const configLeadTime = await prisma.configuracao.findUnique({
      where: { chave: "LEAD_TIME_DIAS" },
    });
    const configMetaSemanal = await prisma.configuracao.findUnique({
      where: { chave: "META_VENDAS_SEMANAL" },
    });

    const leadTime = configLeadTime ? parseInt(configLeadTime.valor) : 20;
    const metaSemanal = configMetaSemanal ? parseInt(configMetaSemanal.valor) : 10;
    const estoqueIdeal = Math.ceil(metaSemanal * (leadTime / 7));

    // Metricas de estoque
    const [
      pecasDisponiveis,
      pecasEmTransito,
      pecasEmRevisao,
      pecasVendidasMes,
      pecasTotal,
    ] = await Promise.all([
      prisma.peca.count({
        where: { status: "DISPONIVEL", arquivado: false },
      }),
      prisma.peca.count({
        where: { status: "EM_TRANSITO", arquivado: false },
      }),
      prisma.peca.count({
        where: { status: "REVISAO", arquivado: false },
      }),
      prisma.peca.count({
        where: {
          status: "VENDIDA",
          venda: { dataVenda: { gte: inicioMes }, cancelada: false },
        },
      }),
      prisma.peca.count({
        where: { arquivado: false },
      }),
    ]);

    const pecasEmEstoque = pecasDisponiveis + pecasEmTransito + pecasEmRevisao;

    // Metricas de vendas
    const [vendasMes, vendasMesAnterior, totalVendas] = await Promise.all([
      prisma.venda.count({
        where: { dataVenda: { gte: inicioMes }, cancelada: false },
      }),
      prisma.venda.count({
        where: {
          dataVenda: { gte: inicioMesAnterior, lte: fimMesAnterior },
          cancelada: false,
        },
      }),
      prisma.venda.count({
        where: { cancelada: false },
      }),
    ]);

    // Variacao vendas
    const variacaoVendas =
      vendasMesAnterior > 0
        ? ((vendasMes - vendasMesAnterior) / vendasMesAnterior) * 100
        : vendasMes > 0
          ? 100
          : 0;

    // Resultado base (sem valores financeiros)
    const resultado: {
      estoque: {
        disponivel: number;
        emTransito: number;
        emRevisao: number;
        total: number;
        emEstoque: number;
        estoqueIdeal: number;
        abaixoIdeal: boolean;
      };
      vendas: {
        mes: number;
        mesAnterior: number;
        variacao: number;
        total: number;
      };
      financeiro: {
        faturamentoMes: number;
        faturamentoMesAnterior: number;
        variacaoFaturamento: number;
        ticketMedio: number;
        recebiveis: number;
        repassesPendentes: number;
        lucroMes: number;
      } | null;
    } = {
      estoque: {
        disponivel: pecasDisponiveis,
        emTransito: pecasEmTransito,
        emRevisao: pecasEmRevisao,
        total: pecasTotal,
        emEstoque: pecasEmEstoque,
        estoqueIdeal,
        abaixoIdeal: pecasEmEstoque < estoqueIdeal,
      },
      vendas: {
        mes: vendasMes,
        mesAnterior: vendasMesAnterior,
        variacao: Math.round(variacaoVendas * 10) / 10,
        total: totalVendas,
      },
      financeiro: null,
    };

    // Adicionar metricas financeiras se usuario tem permissao
    if (podeVerValores) {
      const [
        faturamentoMesResult,
        faturamentoMesAnteriorResult,
        recebiveisResult,
        repassesPendentesResult,
        custoMesResult,
      ] = await Promise.all([
        // Faturamento do mes (soma de valorFinal das vendas)
        prisma.venda.aggregate({
          _sum: { valorFinal: true },
          where: { dataVenda: { gte: inicioMes }, cancelada: false },
        }),
        // Faturamento mes anterior
        prisma.venda.aggregate({
          _sum: { valorFinal: true },
          where: {
            dataVenda: { gte: inicioMesAnterior, lte: fimMesAnterior },
            cancelada: false,
          },
        }),
        // Recebiveis (vendas nao pagas ou parciais)
        prisma.venda.findMany({
          where: {
            statusPagamento: { in: ["NAO_PAGO", "PARCIAL"] },
            cancelada: false,
          },
          include: {
            pagamentos: { select: { valor: true } },
          },
        }),
        // Repasses pendentes
        prisma.venda.aggregate({
          _sum: { valorRepasseDevido: true, valorRepasseFeito: true },
          where: {
            statusRepasse: { in: ["PENDENTE", "PARCIAL"] },
            cancelada: false,
          },
        }),
        // Custo das pecas vendidas no mes (para calcular lucro)
        prisma.peca.aggregate({
          _sum: { valorCompra: true },
          where: {
            status: "VENDIDA",
            venda: { dataVenda: { gte: inicioMes }, cancelada: false },
          },
        }),
      ]);

      const faturamentoMes = Number(faturamentoMesResult._sum.valorFinal) || 0;
      const faturamentoMesAnterior = Number(faturamentoMesAnteriorResult._sum.valorFinal) || 0;

      const variacaoFaturamento =
        faturamentoMesAnterior > 0
          ? ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior) * 100
          : faturamentoMes > 0
            ? 100
            : 0;

      // Calcular recebiveis (valorFinal - soma dos pagamentos)
      const recebiveis = recebiveisResult.reduce((total, venda) => {
        const totalPago = venda.pagamentos.reduce(
          (sum, p) => sum + Number(p.valor),
          0
        );
        return total + (Number(venda.valorFinal) - totalPago);
      }, 0);

      // Calcular repasses pendentes
      const repasseDevido = Number(repassesPendentesResult._sum.valorRepasseDevido) || 0;
      const repasseFeito = Number(repassesPendentesResult._sum.valorRepasseFeito) || 0;
      const repassesPendentes = repasseDevido - repasseFeito;

      // Calcular lucro do mes
      const custoMes = Number(custoMesResult._sum.valorCompra) || 0;
      const lucroMes = faturamentoMes - custoMes;

      // Ticket medio
      const ticketMedio = vendasMes > 0 ? faturamentoMes / vendasMes : 0;

      resultado.financeiro = {
        faturamentoMes,
        faturamentoMesAnterior,
        variacaoFaturamento: Math.round(variacaoFaturamento * 10) / 10,
        ticketMedio,
        recebiveis,
        repassesPendentes,
        lucroMes,
      };
    }

    return resultado;
  }),

  // Dados para grafico de evolucao de vendas (ultimos 6 meses)
  getEvolucaoVendas: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    const podeVerValores = userNivel === "ADMINISTRADOR" || userNivel === "SOCIO";

    const meses: {
      mes: string;
      vendas: number;
      faturamento: number | null;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const data = new Date();
      data.setMonth(data.getMonth() - i);
      const inicioMes = new Date(data.getFullYear(), data.getMonth(), 1);
      const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59);

      const [countVendas, sumFaturamento] = await Promise.all([
        prisma.venda.count({
          where: {
            dataVenda: { gte: inicioMes, lte: fimMes },
            cancelada: false,
          },
        }),
        podeVerValores
          ? prisma.venda.aggregate({
              _sum: { valorFinal: true },
              where: {
                dataVenda: { gte: inicioMes, lte: fimMes },
                cancelada: false,
              },
            })
          : null,
      ]);

      const nomeMes = inicioMes.toLocaleDateString("pt-BR", { month: "short" });

      meses.push({
        mes: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
        vendas: countVendas,
        faturamento: sumFaturamento ? Number(sumFaturamento._sum.valorFinal) || 0 : null,
      });
    }

    return meses;
  }),

  // Top 5 pecas mais recentes disponiveis
  getPecasRecentes: protectedProcedure.query(async () => {
    const pecas = await prisma.peca.findMany({
      where: {
        status: "DISPONIVEL",
        arquivado: false,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        sku: true,
        marca: true,
        modelo: true,
        valorEstimadoVenda: true,
        fotos: {
          take: 1,
          orderBy: { ordem: "asc" },
          select: { url: true },
        },
      },
    });

    return pecas;
  }),

  // Vendas recentes (ultimas 5)
  getVendasRecentes: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    const podeVerValores = userNivel === "ADMINISTRADOR" || userNivel === "SOCIO";

    const vendas = await prisma.venda.findMany({
      where: { cancelada: false },
      orderBy: { dataVenda: "desc" },
      take: 5,
      select: {
        id: true,
        dataVenda: true,
        valorFinal: podeVerValores,
        statusPagamento: true,
        peca: {
          select: {
            sku: true,
            marca: true,
            modelo: true,
          },
        },
        cliente: {
          select: {
            nome: true,
          },
        },
      },
    });

    return vendas;
  }),

  // Pecas em revisao (para card de alerta)
  getPecasEmRevisao: protectedProcedure.query(async () => {
    const configDiasRelojoeiro = await prisma.configuracao.findUnique({
      where: { chave: "ALERTA_DIAS_RELOJOEIRO" },
    });
    const diasLimite = configDiasRelojoeiro ? parseInt(configDiasRelojoeiro.valor) : 14;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    const pecas = await prisma.peca.findMany({
      where: {
        status: "REVISAO",
        arquivado: false,
      },
      include: {
        historicoStatus: {
          where: { statusNovo: "REVISAO" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
    });

    return pecas.map((peca) => {
      const ultimoHistorico = peca.historicoStatus[0];
      const diasEmRevisao = ultimoHistorico
        ? Math.floor(
            (Date.now() - ultimoHistorico.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      return {
        id: peca.id,
        sku: peca.sku,
        marca: peca.marca,
        modelo: peca.modelo,
        localizacao: peca.localizacao,
        diasEmRevisao,
        atrasado: diasEmRevisao > diasLimite,
      };
    });
  }),

  // Dividas com fornecedores (repasses + pagamentos de pecas compradas)
  getDividasFornecedores: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    if (userNivel === "FUNCIONARIO") {
      return null;
    }

    // 1. Repasses pendentes (pecas consignadas que foram vendidas)
    const repassesPendentes = await prisma.venda.findMany({
      where: {
        cancelada: false,
        statusRepasse: { in: ["PENDENTE", "PARCIAL"] },
        peca: { origemTipo: "CONSIGNACAO" },
      },
      select: {
        id: true,
        valorRepasseDevido: true,
        valorRepasseFeito: true,
        dataVenda: true,
        peca: {
          select: {
            sku: true,
            marca: true,
            modelo: true,
            fornecedor: { select: { nome: true } },
          },
        },
      },
      orderBy: { dataVenda: "asc" },
    });

    const totalRepassePendente = repassesPendentes.reduce((sum, v) => {
      const devido = Number(v.valorRepasseDevido) || 0;
      const feito = Number(v.valorRepasseFeito) || 0;
      return sum + (devido - feito);
    }, 0);

    // 2. Pagamentos de pecas compradas pendentes (NAO_PAGO ou PARCIAL)
    const pagamentosPendentes = await prisma.peca.findMany({
      where: {
        origemTipo: "COMPRA",
        statusPagamentoFornecedor: { in: ["NAO_PAGO", "PARCIAL"] },
        arquivado: false,
      },
      select: {
        id: true,
        sku: true,
        marca: true,
        modelo: true,
        valorCompra: true,
        valorPagoFornecedor: true,
        createdAt: true,
        fornecedor: { select: { nome: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const totalPagamentoPendente = pagamentosPendentes.reduce((sum, p) => {
      const compra = Number(p.valorCompra) || 0;
      const pago = Number(p.valorPagoFornecedor) || 0;
      return sum + (compra - pago);
    }, 0);

    return {
      repasses: {
        total: totalRepassePendente,
        quantidade: repassesPendentes.length,
        itens: repassesPendentes.slice(0, 5).map((v) => ({
          id: v.id,
          sku: v.peca.sku,
          marca: v.peca.marca,
          modelo: v.peca.modelo,
          fornecedor: v.peca.fornecedor.nome,
          devido: Number(v.valorRepasseDevido) || 0,
          pago: Number(v.valorRepasseFeito) || 0,
          pendente: (Number(v.valorRepasseDevido) || 0) - (Number(v.valorRepasseFeito) || 0),
          dataVenda: v.dataVenda,
        })),
      },
      pagamentos: {
        total: totalPagamentoPendente,
        quantidade: pagamentosPendentes.length,
        itens: pagamentosPendentes.slice(0, 5).map((p) => ({
          id: p.id,
          sku: p.sku,
          marca: p.marca,
          modelo: p.modelo,
          fornecedor: p.fornecedor.nome,
          valorCompra: Number(p.valorCompra) || 0,
          valorPago: Number(p.valorPagoFornecedor) || 0,
          pendente: (Number(p.valorCompra) || 0) - (Number(p.valorPagoFornecedor) || 0),
          dataCadastro: p.createdAt,
        })),
      },
      totalGeral: totalRepassePendente + totalPagamentoPendente,
    };
  }),

  // Recebiveis pendentes detalhados
  getRecebiveisPendentes: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    if (userNivel === "FUNCIONARIO") {
      return [];
    }

    const vendas = await prisma.venda.findMany({
      where: {
        statusPagamento: { in: ["NAO_PAGO", "PARCIAL"] },
        cancelada: false,
      },
      include: {
        pagamentos: { select: { valor: true } },
        peca: { select: { sku: true } },
        cliente: { select: { nome: true } },
      },
      orderBy: { dataVenda: "asc" },
      take: 10,
    });

    return vendas.map((venda) => {
      const totalPago = venda.pagamentos.reduce(
        (sum, p) => sum + Number(p.valor),
        0
      );
      const saldoDevedor = Number(venda.valorFinal) - totalPago;

      return {
        id: venda.id,
        sku: venda.peca.sku,
        cliente: venda.cliente.nome,
        valorTotal: Number(venda.valorFinal),
        totalPago,
        saldoDevedor,
        dataVenda: venda.dataVenda,
        statusPagamento: venda.statusPagamento,
      };
    });
  }),
});
