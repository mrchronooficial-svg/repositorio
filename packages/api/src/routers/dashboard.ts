import { z } from "zod";
import { protectedProcedure, router } from "../index";
import prisma from "@gestaomrchrono/db";
import { gerarDRE } from "../services/demonstrativos.service";
import {
  brtDayIndex,
  brtDayIndexToDate,
  brtMonthEnd,
  brtMonthOf,
  brtMonthStart,
  brtToday,
} from "../utils/brt-date";
import {
  HISTORICO_TOTAIS,
  HISTORICO_VENDAS,
  NOMES_MESES,
} from "../utils/historico-vendas";
import { calcularLucroBruto, carregarImpostoConfig } from "../utils/lucro-bruto";
import { calcularSaldoDevedor } from "../utils/pagamento";
import { filtroOrigemPropria } from "../utils/origem";

export const dashboardRouter = router({
  // Metricas principais do dashboard
  getMetricas: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    const podeVerValores = userNivel === "ADMINISTRADOR" || userNivel === "SOCIO";

    // Datas para filtros (em horario de Brasilia)
    const hojeBrt = brtToday();
    const inicioMes = brtMonthStart(hojeBrt.year, hojeBrt.month);
    let mesAntIdx = hojeBrt.month - 1;
    let anoAnt = hojeBrt.year;
    if (mesAntIdx < 0) {
      mesAntIdx = 11;
      anoAnt -= 1;
    }
    const inicioMesAnterior = brtMonthStart(anoAnt, mesAntIdx);
    const fimMesAnterior = brtMonthStart(hojeBrt.year, hojeBrt.month);

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

    // Metricas de estoque — KPIs consideram apenas peças COMPRADAS
    // (consignadas continuam nas listagens, financeiro, etc.)
    const [
      pecasDisponiveis,
      pecasEmTransito,
      pecasEmRevisao,
      _pecasVendidasMes,
      pecasTotal,
    ] = await Promise.all([
      prisma.peca.count({
        where: { status: "DISPONIVEL", arquivado: false, origemTipo: filtroOrigemPropria },
      }),
      prisma.peca.count({
        where: { status: "EM_TRANSITO", arquivado: false, origemTipo: filtroOrigemPropria },
      }),
      prisma.peca.count({
        where: { status: "REVISAO", arquivado: false, origemTipo: filtroOrigemPropria },
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
          dataVenda: { gte: inicioMesAnterior, lt: fimMesAnterior },
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
        lucroBrutoMes: number | null;
        margemBrutaMes: number | null;
        lucroBrutoPorPeca: number | null;
        lucroLiquidoMes: number | null;
        lucroLiquidoPorPeca: number | null;
      } | null;
      isAdmin: boolean;
    } = {
      estoque: {
        disponivel: pecasDisponiveis,
        emTransito: pecasEmTransito,
        emRevisao: pecasEmRevisao,
        total: pecasTotal,
        emEstoque: pecasEmEstoque,
        estoqueIdeal,
        abaixoIdeal: pecasDisponiveis < estoqueIdeal,
      },
      vendas: {
        mes: vendasMes,
        mesAnterior: vendasMesAnterior,
        variacao: Math.round(variacaoVendas * 10) / 10,
        total: totalVendas,
      },
      financeiro: null,
      isAdmin: userNivel === "ADMINISTRADOR",
    };

    // Adicionar metricas financeiras se usuario tem permissao
    if (podeVerValores) {
      const [
        vendasMesResult,
        vendasMesAnteriorResult,
        recebiveisResult,
        repassesPendentesResult,
        custoMesResult,
      ] = await Promise.all([
        // Vendas do mes (para calcular faturamento real e lucro bruto)
        prisma.venda.findMany({
          where: { dataVenda: { gte: inicioMes }, cancelada: false },
          select: {
            valorFinal: true,
            valorRepasseDevido: true,
            formaPagamento: true,
            taxaMDR: true,
            dataVenda: true,
            peca: {
              select: {
                origemTipo: true,
                valorCompra: true,
                custoManutencao: true,
              },
            },
          },
        }),
        // Vendas mes anterior (para calcular faturamento real)
        prisma.venda.findMany({
          where: {
            dataVenda: { gte: inicioMesAnterior, lt: fimMesAnterior },
            cancelada: false,
          },
          select: { valorFinal: true, valorRepasseDevido: true },
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

      // Calcular faturamento real:
      // - Compra: valorFinal (receita total)
      // - Consignacao: valorFinal - valorRepasseDevido (margem da Mr. Chrono)
      const faturamentoMes = vendasMesResult.reduce((total, v) => {
        const valorFinal = Number(v.valorFinal) || 0;
        const valorRepasse = Number(v.valorRepasseDevido) || 0;
        // Se tem repasse, é consignação: receita = margem
        return total + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
      }, 0);

      const faturamentoMesAnterior = vendasMesAnteriorResult.reduce((total, v) => {
        const valorFinal = Number(v.valorFinal) || 0;
        const valorRepasse = Number(v.valorRepasseDevido) || 0;
        return total + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
      }, 0);

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
        return total + calcularSaldoDevedor(Number(venda.valorFinal), totalPago);
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

      // Calcular lucro bruto (apenas para admin)
      // Deduz: custo de aquisição/repasse, MDR, Simples Nacional, custoManutencao (relojoeiro/restauro)
      let lucroBrutoMes: number | null = null;
      let margemBrutaMes: number | null = null;
      let lucroBrutoPorPeca: number | null = null;

      if (userNivel === "ADMINISTRADOR") {
        const somaValorFinal = vendasMesResult.reduce(
          (sum, v) => sum + (Number(v.valorFinal) || 0),
          0
        );

        const impostoConfig = vendasMesResult.length > 0
          ? await carregarImpostoConfig()
          : null;

        lucroBrutoMes = impostoConfig
          ? vendasMesResult.reduce((total, v) => {
              return (
                total +
                calcularLucroBruto(
                  {
                    valorFinal: Number(v.valorFinal) || 0,
                    formaPagamento: v.formaPagamento,
                    taxaMDR: Number(v.taxaMDR) || 0,
                    valorRepasseDevido: v.valorRepasseDevido
                      ? Number(v.valorRepasseDevido)
                      : null,
                    origemTipo: v.peca.origemTipo,
                    valorCompra: Number(v.peca.valorCompra) || 0,
                    custoManutencao: Number(v.peca.custoManutencao) || 0,
                  },
                  impostoConfig
                )
              );
            }, 0)
          : 0;

        margemBrutaMes =
          somaValorFinal > 0
            ? Math.round((lucroBrutoMes / somaValorFinal) * 1000) / 10
            : 0;

        lucroBrutoPorPeca =
          vendasMesResult.length > 0
            ? Math.round((lucroBrutoMes / vendasMesResult.length) * 100) / 100
            : 0;
      }

      // Lucro Líquido via DRE (admin e sócio)
      let lucroLiquidoMes: number | null = null;
      let lucroLiquidoPorPeca: number | null = null;

      if (userNivel === "ADMINISTRADOR" || userNivel === "SOCIO") {
        try {
          const dre = await gerarDRE(hojeBrt.month + 1, hojeBrt.year);
          lucroLiquidoMes = dre.resumo.lucroLiquido;
          lucroLiquidoPorPeca =
            vendasMes > 0
              ? Math.round((dre.resumo.lucroLiquido / vendasMes) * 100) / 100
              : 0;
        } catch {
          // DRE pode falhar se não há dados financeiros ainda
        }
      }

      resultado.financeiro = {
        faturamentoMes,
        faturamentoMesAnterior,
        variacaoFaturamento: Math.round(variacaoFaturamento * 10) / 10,
        ticketMedio,
        recebiveis,
        repassesPendentes,
        lucroMes,
        lucroBrutoMes,
        margemBrutaMes,
        lucroBrutoPorPeca,
        lucroLiquidoMes,
        lucroLiquidoPorPeca,
      };
    }

    return resultado;
  }),

  // Dados para grafico de evolucao de vendas (ultimos 6 meses)
  // Para meses cobertos pelo historico manual (ate Jan/2026), usa o total
  // hardcoded em HISTORICO_VENDAS para manter consistencia com o "Pace de
  // Vendas". Demais meses sao contados a partir do banco usando fronteiras
  // de mes em horario de Brasilia (BRT).
  getEvolucaoVendas: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    const podeVerValores = userNivel === "ADMINISTRADOR" || userNivel === "SOCIO";

    const meses: {
      mes: string;
      vendas: number;
      faturamento: number | null;
    }[] = [];

    const hoje = brtToday();

    for (let i = 5; i >= 0; i--) {
      // Mes alvo em BRT: hoje - i meses
      let ano = hoje.year;
      let mesIdx = hoje.month - i;
      while (mesIdx < 0) {
        mesIdx += 12;
        ano -= 1;
      }

      const inicioMes = brtMonthStart(ano, mesIdx);
      const fimMes = brtMonthEnd(ano, mesIdx);

      // Total da fonte historica (se aplicavel) tem prioridade
      const chaveHistorico = `${ano}-${String(mesIdx).padStart(2, "0")}`;
      const totalHistorico = HISTORICO_TOTAIS.get(chaveHistorico);

      let countVendas: number;
      let vendasDoMes: { valorFinal: unknown; valorRepasseDevido: unknown }[] | null = null;

      if (totalHistorico !== undefined) {
        countVendas = totalHistorico;
        // Faturamento dos meses historicos nao foi imputado: mantem null
      } else {
        const [count, valores] = await Promise.all([
          prisma.venda.count({
            where: {
              dataVenda: { gte: inicioMes, lt: fimMes },
              cancelada: false,
            },
          }),
          podeVerValores
            ? prisma.venda.findMany({
                where: {
                  dataVenda: { gte: inicioMes, lt: fimMes },
                  cancelada: false,
                },
                select: { valorFinal: true, valorRepasseDevido: true },
              })
            : null,
        ]);
        countVendas = count;
        vendasDoMes = valores;
      }

      // Calcular faturamento real (consignação = margem)
      let faturamento: number | null = null;
      if (vendasDoMes) {
        faturamento = vendasDoMes.reduce((total, v) => {
          const valorFinal = Number(v.valorFinal) || 0;
          const valorRepasse = Number(v.valorRepasseDevido) || 0;
          return total + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
        }, 0);
      }

      meses.push({
        mes: NOMES_MESES[mesIdx]!,
        vendas: countVendas,
        faturamento,
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

    // 2. Pagamentos de pecas proprias (compra/encomenda) pendentes (NAO_PAGO ou PARCIAL)
    const pagamentosPendentes = await prisma.peca.findMany({
      where: {
        origemTipo: filtroOrigemPropria,
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

  // Metricas de valor do estoque
  getMetricasValorEstoque: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    if (userNivel === "FUNCIONARIO") {
      return null;
    }

    // Status que contam como "em estoque"
    const statusEmEstoque = ["DISPONIVEL", "EM_TRANSITO", "REVISAO"] as const;

    // KPIs de estoque consideram apenas peças PRÓPRIAS (compra + encomenda)
    // (consignado não é capital investido pela empresa)
    const totalPecas = await prisma.peca.count({
      where: {
        arquivado: false,
        status: { in: [...statusEmEstoque] },
        origemTipo: filtroOrigemPropria,
      },
    });

    // Valor em custo (apenas pecas COMPRADAS - consignado nao teve gasto de caixa)
    const custoEstoque = await prisma.peca.aggregate({
      _sum: { valorCompra: true },
      where: {
        arquivado: false,
        status: { in: [...statusEmEstoque] },
        origemTipo: filtroOrigemPropria,
      },
    });

    // Valor em faturamento (soma do valor estimado de venda das pecas COMPRADAS em estoque)
    const faturamentoEstoque = await prisma.peca.aggregate({
      _sum: { valorEstimadoVenda: true },
      where: {
        arquivado: false,
        status: { in: [...statusEmEstoque] },
        origemTipo: filtroOrigemPropria,
      },
    });

    return {
      totalPecas,
      valorCusto: Number(custoEstoque._sum.valorCompra) || 0,
      valorFaturamento: Number(faturamentoEstoque._sum.valorEstimadoVenda) || 0,
    };
  }),

  // Distribuição do estoque por faixa de lucro bruto estimado.
  // Inclui peças PRÓPRIAS e CONSIGNADAS, divididas em "disponíveis" (DISPONIVEL)
  // e "chegando" (EM_TRANSITO). Peças com lucro bruto < R$ 2.000 são ignoradas.
  // Lucro bruto estimado por peça = valorEstimadoVenda − custo, onde o custo é
  // valorCompra (própria) ou o repasse (consignada: valor fixo ou % do estimado).
  // Mesma fórmula exibida na coluna "Lucro Bruto" da listagem de estoque.
  getFaixasLucroBruto: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    if (userNivel === "FUNCIONARIO") {
      return null;
    }

    const pecas = await prisma.peca.findMany({
      where: {
        arquivado: false,
        status: { in: ["DISPONIVEL", "EM_TRANSITO"] },
      },
      select: {
        status: true,
        origemTipo: true,
        valorEstimadoVenda: true,
        valorCompra: true,
        valorRepasse: true,
        percentualRepasse: true,
      },
    });

    // Faixas (min inclusivo, max exclusivo; max null = sem teto)
    const faixas = [
      { label: "R$ 2.000 – 2.500", min: 2000, max: 2500, disponiveis: 0, chegando: 0 },
      { label: "R$ 2.500 – 3.000", min: 2500, max: 3000, disponiveis: 0, chegando: 0 },
      { label: "R$ 3.000 – 3.500", min: 3000, max: 3500, disponiveis: 0, chegando: 0 },
      { label: "R$ 3.500 – 4.000", min: 3500, max: 4000, disponiveis: 0, chegando: 0 },
      { label: "R$ 4.000 – 5.000", min: 4000, max: 5000, disponiveis: 0, chegando: 0 },
      { label: "Acima de R$ 5.000", min: 5000, max: null as number | null, disponiveis: 0, chegando: 0 },
    ];

    for (const p of pecas) {
      const valorVenda = Number(p.valorEstimadoVenda) || 0;
      if (!valorVenda) continue;

      let custo: number;
      if (p.origemTipo === "CONSIGNACAO") {
        if (p.valorRepasse) {
          custo = Number(p.valorRepasse);
        } else if (p.percentualRepasse) {
          custo = valorVenda * (Number(p.percentualRepasse) / 100);
        } else {
          custo = 0;
        }
      } else {
        custo = Number(p.valorCompra) || 0;
      }

      const lucro = valorVenda - custo;
      if (lucro < 2000) continue; // abaixo de 2k não aparece

      const faixa = faixas.find(
        (f) => lucro >= f.min && (f.max === null || lucro < f.max)
      );
      if (!faixa) continue;

      if (p.status === "DISPONIVEL") faixa.disponiveis++;
      else if (p.status === "EM_TRANSITO") faixa.chegando++;
    }

    const totalDisponiveis = faixas.reduce((acc, f) => acc + f.disponiveis, 0);
    const totalChegando = faixas.reduce((acc, f) => acc + f.chegando, 0);

    return {
      faixas: faixas.map((f) => ({
        label: f.label,
        disponiveis: f.disponiveis,
        chegando: f.chegando,
        total: f.disponiveis + f.chegando,
      })),
      totalDisponiveis,
      totalChegando,
      totalGeral: totalDisponiveis + totalChegando,
    };
  }),

  // Pace de vendas diario por mes (cumulativo)
  // Historico manual: ate Jan/2026 (fonte: utils/historico-vendas.ts)
  // Banco: Fev/2026 em diante, agrupado por dia em horario de Brasilia (BRT)
  getPaceVendas: protectedProcedure.query(async () => {
    // Inicio de Fev/2026 em BRT
    const inicioDb = brtMonthStart(2026, 1);

    const vendas = await prisma.venda.findMany({
      where: {
        cancelada: false,
        dataVenda: { gte: inicioDb },
      },
      select: { dataVenda: true },
      orderBy: { dataVenda: "asc" },
    });

    const mesesMap = new Map<
      string,
      { mes: string; ano: number; contagemPorDia: Map<number, number> }
    >();

    for (const v of vendas) {
      const ms = new Date(v.dataVenda).getTime() - 3 * 60 * 60 * 1000;
      const brt = new Date(ms);
      const ano = brt.getUTCFullYear();
      const mesIdx = brt.getUTCMonth();
      const dia = brt.getUTCDate();

      const key = `${ano}-${String(mesIdx).padStart(2, "0")}`;
      if (!mesesMap.has(key)) {
        mesesMap.set(key, {
          mes: NOMES_MESES[mesIdx]!,
          ano,
          contagemPorDia: new Map(),
        });
      }
      const entry = mesesMap.get(key)!;
      entry.contagemPorDia.set(dia, (entry.contagemPorDia.get(dia) || 0) + 1);
    }

    const dadosBanco = Array.from(mesesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, entry]) => {
        const dados: Array<{ dia: number; acumulado: number }> = [];
        let acumulado = 0;
        const mesIdx = NOMES_MESES.indexOf(entry.mes);
        const ultimoDia = new Date(Date.UTC(entry.ano, mesIdx + 1, 0)).getUTCDate();
        for (let dia = 1; dia <= ultimoDia; dia++) {
          acumulado += entry.contagemPorDia.get(dia) || 0;
          dados.push({ dia, acumulado });
        }
        return { mes: entry.mes, ano: entry.ano, dados };
      });

    // Filtrar historicos para exibir apenas os ultimos 9 meses (em BRT)
    const hoje = brtToday();
    let anoLimite = hoje.year;
    let mesLimite = hoje.month - 8;
    while (mesLimite < 0) {
      mesLimite += 12;
      anoLimite -= 1;
    }
    const todosOsMeses = [...HISTORICO_VENDAS, ...dadosBanco];

    const resultado = todosOsMeses.filter((m) => {
      const mesIdx = NOMES_MESES.indexOf(m.mes);
      // m.ano/mesIdx >= anoLimite/mesLimite
      return (
        m.ano > anoLimite ||
        (m.ano === anoLimite && mesIdx >= mesLimite)
      );
    });

    return resultado;
  }),

  // Pace de Lucro Bruto diario por mes (cumulativo, em R$)
  // Apenas para ADMINISTRADOR (igual ao KPI Lucro Bruto).
  // Considera vendas a partir de Fev/2026 em diante (em BRT).
  // IMPORTANTE: para esse grafico, custoManutencao (relojoeiro/restauro) e
  // ignorado, pois e input manual e gerenciado a parte. Demais deducoes
  // (CMV/repasse, MDR, Simples Nacional) seguem a formula padrao.
  getPaceLucroBruto: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.nivel !== "ADMINISTRADOR") {
      return [] as Array<{
        mes: string;
        ano: number;
        dados: Array<{ dia: number; acumulado: number }>;
      }>;
    }

    const inicioDb = brtMonthStart(2026, 1);

    const vendas = await prisma.venda.findMany({
      where: {
        cancelada: false,
        dataVenda: { gte: inicioDb },
      },
      select: {
        dataVenda: true,
        valorFinal: true,
        formaPagamento: true,
        taxaMDR: true,
        valorRepasseDevido: true,
        peca: {
          select: {
            origemTipo: true,
            valorCompra: true,
          },
        },
      },
      orderBy: { dataVenda: "asc" },
    });

    if (vendas.length === 0) {
      return [];
    }

    const impostoConfig = await carregarImpostoConfig();

    const mesesMap = new Map<
      string,
      { mes: string; ano: number; valorPorDia: Map<number, number> }
    >();

    for (const v of vendas) {
      const ms = new Date(v.dataVenda).getTime() - 3 * 60 * 60 * 1000;
      const brt = new Date(ms);
      const ano = brt.getUTCFullYear();
      const mesIdx = brt.getUTCMonth();
      const dia = brt.getUTCDate();

      const lucro = calcularLucroBruto(
        {
          valorFinal: Number(v.valorFinal) || 0,
          formaPagamento: v.formaPagamento,
          taxaMDR: Number(v.taxaMDR) || 0,
          valorRepasseDevido: v.valorRepasseDevido
            ? Number(v.valorRepasseDevido)
            : null,
          origemTipo: v.peca.origemTipo,
          valorCompra: Number(v.peca.valorCompra) || 0,
          custoManutencao: 0, // ignorado neste grafico
        },
        impostoConfig
      );

      const key = `${ano}-${String(mesIdx).padStart(2, "0")}`;
      if (!mesesMap.has(key)) {
        mesesMap.set(key, {
          mes: NOMES_MESES[mesIdx]!,
          ano,
          valorPorDia: new Map(),
        });
      }
      const entry = mesesMap.get(key)!;
      entry.valorPorDia.set(dia, (entry.valorPorDia.get(dia) || 0) + lucro);
    }

    const resultado = Array.from(mesesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, entry]) => {
        const dados: Array<{ dia: number; acumulado: number }> = [];
        let acumulado = 0;
        const mesIdx = NOMES_MESES.indexOf(entry.mes);
        const ultimoDia = new Date(Date.UTC(entry.ano, mesIdx + 1, 0)).getUTCDate();
        for (let dia = 1; dia <= ultimoDia; dia++) {
          acumulado += entry.valorPorDia.get(dia) || 0;
          dados.push({ dia, acumulado: Math.round(acumulado * 100) / 100 });
        }
        return { mes: entry.mes, ano: entry.ano, dados };
      });

    return resultado;
  }),

  // Lucro bruto medio por peca vendida, agrupado por marca, no mes escolhido.
  // Considera SOMENTE pecas vendidas no mes (nunca estoque nao vendido) e
  // SOMENTE pecas proprias (COMPRA/ENCOMENDA); consignadas ficam de fora.
  getLucroBrutoPorMarca: protectedProcedure
    .input(
      z
        .object({
          ano: z.number().int().min(2000).max(2100).optional(),
          mes: z.number().int().min(0).max(11).optional(), // 0 = Janeiro
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.nivel !== "ADMINISTRADOR") {
        return null;
      }

      // Meses que possuem vendas de pecas proprias (em horario de Brasilia)
      const todasVendas = await prisma.venda.findMany({
        where: {
          cancelada: false,
          peca: { origemTipo: filtroOrigemPropria },
        },
        select: { dataVenda: true },
      });

      const mesesSet = new Map<string, { ano: number; mes: number }>();
      for (const v of todasVendas) {
        const { year, month } = brtMonthOf(new Date(v.dataVenda));
        mesesSet.set(`${year}-${String(month).padStart(2, "0")}`, {
          ano: year,
          mes: month,
        });
      }

      const hojeBrt = brtToday();
      // Garante que o mes corrente sempre aparece na lista
      mesesSet.set(
        `${hojeBrt.year}-${String(hojeBrt.month).padStart(2, "0")}`,
        { ano: hojeBrt.year, mes: hojeBrt.month }
      );

      const mesesDisponiveis = Array.from(mesesSet.values())
        .sort((a, b) => (a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes))
        .map((m) => ({
          ano: m.ano,
          mes: m.mes,
          label: `${NOMES_MESES[m.mes]}/${m.ano}`,
        }));

      // Mes selecionado (default: mes corrente)
      const anoSel = input?.ano ?? hojeBrt.year;
      const mesSel = input?.mes ?? hojeBrt.month;

      const vendas = await prisma.venda.findMany({
        where: {
          cancelada: false,
          // Somente pecas proprias (compradas/encomendadas); consignadas ficam
          // de fora, pois o custo delas e um repasse e nao um valor de compra.
          peca: { origemTipo: filtroOrigemPropria },
          dataVenda: {
            gte: brtMonthStart(anoSel, mesSel),
            lt: brtMonthEnd(anoSel, mesSel),
          },
        },
        select: {
          valorFinal: true,
          formaPagamento: true,
          taxaMDR: true,
          valorRepasseDevido: true,
          peca: {
            select: {
              marca: true,
              origemTipo: true,
              valorCompra: true,
              custoManutencao: true,
            },
          },
        },
      });

      if (vendas.length === 0) {
        return {
          ano: anoSel,
          mes: mesSel,
          label: `${NOMES_MESES[mesSel]}/${anoSel}`,
          mesesDisponiveis,
          marcas: [],
          totalPecas: 0,
          lucroBrutoTotal: 0,
          lucroBrutoPorPecaGeral: 0,
        };
      }

      const impostoConfig = await carregarImpostoConfig();

      const porMarca = new Map<
        string,
        { marca: string; quantidade: number; lucroBrutoTotal: number }
      >();

      for (const v of vendas) {
        const marca = (v.peca.marca || "Sem marca").trim() || "Sem marca";

        const lucro = calcularLucroBruto(
          {
            valorFinal: Number(v.valorFinal) || 0,
            formaPagamento: v.formaPagamento,
            taxaMDR: Number(v.taxaMDR) || 0,
            valorRepasseDevido: v.valorRepasseDevido
              ? Number(v.valorRepasseDevido)
              : null,
            origemTipo: v.peca.origemTipo,
            valorCompra: Number(v.peca.valorCompra) || 0,
            custoManutencao: Number(v.peca.custoManutencao) || 0,
          },
          impostoConfig
        );

        const atual = porMarca.get(marca) ?? {
          marca,
          quantidade: 0,
          lucroBrutoTotal: 0,
        };
        atual.quantidade += 1;
        atual.lucroBrutoTotal += lucro;
        porMarca.set(marca, atual);
      }

      const marcas = Array.from(porMarca.values())
        .map((m) => ({
          marca: m.marca,
          quantidade: m.quantidade,
          lucroBrutoTotal: Math.round(m.lucroBrutoTotal * 100) / 100,
          lucroBrutoPorPeca:
            Math.round((m.lucroBrutoTotal / m.quantidade) * 100) / 100,
        }))
        .sort((a, b) => b.lucroBrutoPorPeca - a.lucroBrutoPorPeca);

      const lucroBrutoTotal =
        Math.round(
          marcas.reduce((sum, m) => sum + m.lucroBrutoTotal, 0) * 100
        ) / 100;
      const totalPecas = marcas.reduce((sum, m) => sum + m.quantidade, 0);

      return {
        ano: anoSel,
        mes: mesSel,
        label: `${NOMES_MESES[mesSel]}/${anoSel}`,
        mesesDisponiveis,
        marcas,
        totalPecas,
        lucroBrutoTotal,
        lucroBrutoPorPecaGeral:
          totalPecas > 0
            ? Math.round((lucroBrutoTotal / totalPecas) * 100) / 100
            : 0,
      };
    }),

  // Dias de Estoque (Days of Inventory), serie diaria.
  //
  //   dias de estoque(D) = valor do estoque em D / CMV dos 30 dias ate D x 30
  //
  // Numerador: custo (valorCompra + custoManutencao) das pecas PROPRIAS que
  // estavam em estoque no fim do dia D — status DISPONIVEL, EM_TRANSITO ou
  // REVISAO, mesma regra do balanco. O status na data e reconstruido pelo
  // historico de status de cada peca (toda peca ganha um registro ao ser criada).
  //
  // Denominador: custo das pecas proprias vendidas na janela de 30 dias que
  // termina em D (inclusive). Mesma base de custo do numerador, para que a razao
  // seja consistente.
  //
  // A serie comeca 30 dias apos o inicio dos dados, que e quando a primeira
  // janela de 30 dias fica inteiramente coberta.
  getDiasEstoque: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    if (userNivel === "FUNCIONARIO") {
      return null;
    }

    const STATUS_EM_ESTOQUE = new Set(["DISPONIVEL", "EM_TRANSITO", "REVISAO"]);

    const [pecas, vendas] = await Promise.all([
      prisma.peca.findMany({
        where: { origemTipo: filtroOrigemPropria },
        select: {
          createdAt: true,
          status: true,
          valorCompra: true,
          custoManutencao: true,
          historicoStatus: {
            orderBy: { createdAt: "asc" },
            select: { createdAt: true, statusNovo: true },
          },
        },
      }),
      prisma.venda.findMany({
        where: {
          cancelada: false,
          peca: { origemTipo: filtroOrigemPropria },
        },
        select: {
          dataVenda: true,
          peca: { select: { valorCompra: true, custoManutencao: true } },
        },
      }),
    ]);

    if (pecas.length === 0 || vendas.length === 0) {
      return { serie: [], atual: null };
    }

    const hojeBrt = brtToday();
    const diaFim = brtDayIndex(
      new Date(Date.UTC(hojeBrt.year, hojeBrt.month, hojeBrt.day, 12))
    );

    // Primeiro dia com dados: precisa de peca cadastrada E venda registrada
    const primeiroDiaPeca = Math.min(...pecas.map((p) => brtDayIndex(p.createdAt)));
    const primeiroDiaVenda = Math.min(...vendas.map((v) => brtDayIndex(v.dataVenda)));
    const diaBase = Math.max(primeiroDiaPeca, primeiroDiaVenda);
    // A primeira janela de 30 dias so fecha 29 dias depois do inicio
    const diaInicio = diaBase + 29;

    if (diaInicio > diaFim) {
      return { serie: [], atual: null };
    }

    const totalDias = diaFim - diaBase + 1;

    // ── Numerador: valor do estoque por dia, via deltas ──
    // Cada peca soma seu custo nos intervalos de dias em que esteve em estoque.
    // +1 no tamanho para absorver o delta de saida do ultimo dia.
    const deltaEstoque = new Array<number>(totalDias + 1).fill(0);
    // Mesma reconstrucao, contando pecas em vez de somar custo
    const deltaQtd = new Array<number>(totalDias + 1).fill(0);

    for (const p of pecas) {
      // Peca sem custo registrado ainda conta na quantidade
      const custo = Number(p.valorCompra || 0) + Number(p.custoManutencao || 0);

      // Status no FIM de cada dia: quando ha mais de uma mudanca no mesmo dia,
      // vale a ultima.
      const statusPorDia = new Map<number, string>();
      for (const h of p.historicoStatus) {
        statusPorDia.set(brtDayIndex(h.createdAt), h.statusNovo);
      }
      if (statusPorDia.size === 0) {
        statusPorDia.set(brtDayIndex(p.createdAt), p.status);
      }

      const diasTransicao = Array.from(statusPorDia.keys()).sort((a, b) => a - b);

      let inicioIntervalo: number | null = null;
      for (let i = 0; i < diasTransicao.length; i++) {
        const dia = diasTransicao[i]!;
        const emEstoque = STATUS_EM_ESTOQUE.has(statusPorDia.get(dia)!);

        if (emEstoque && inicioIntervalo === null) {
          inicioIntervalo = dia;
        } else if (!emEstoque && inicioIntervalo !== null) {
          aplicarIntervalo(deltaEstoque, diaBase, totalDias, inicioIntervalo, dia, custo);
          aplicarIntervalo(deltaQtd, diaBase, totalDias, inicioIntervalo, dia, 1);
          inicioIntervalo = null;
        }
      }
      // Intervalo aberto: a peca continua em estoque ate hoje
      if (inicioIntervalo !== null) {
        aplicarIntervalo(deltaEstoque, diaBase, totalDias, inicioIntervalo, diaFim + 1, custo);
        aplicarIntervalo(deltaQtd, diaBase, totalDias, inicioIntervalo, diaFim + 1, 1);
      }
    }

    // ── Denominador: CMV por dia ──
    const cmvPorDia = new Array<number>(totalDias).fill(0);
    for (const v of vendas) {
      const idx = brtDayIndex(v.dataVenda) - diaBase;
      if (idx < 0 || idx >= totalDias) continue;
      cmvPorDia[idx]! +=
        Number(v.peca.valorCompra || 0) + Number(v.peca.custoManutencao || 0);
    }

    // ── Serie ──
    const serie: Array<{
      data: string;
      diasEstoque: number | null;
      valorEstoque: number;
      qtdEstoque: number;
      cmv30: number;
    }> = [];

    let valorEstoque = 0;
    let qtdEstoque = 0;
    let janela30 = 0;

    for (let i = 0; i < totalDias; i++) {
      valorEstoque += deltaEstoque[i]!;
      qtdEstoque += deltaQtd[i]!;

      janela30 += cmvPorDia[i]!;
      if (i >= 30) janela30 -= cmvPorDia[i - 30]!;

      if (i < diaInicio - diaBase) continue;

      const cmv30 = Math.round(janela30 * 100) / 100;
      serie.push({
        data: brtDayIndexToDate(diaBase + i).toISOString().slice(0, 10),
        diasEstoque:
          cmv30 > 0
            ? Math.round((valorEstoque / cmv30) * 30 * 10) / 10
            : null,
        valorEstoque: Math.round(valorEstoque * 100) / 100,
        qtdEstoque,
        cmv30,
      });
    }

    const atual = serie.length > 0 ? serie[serie.length - 1]! : null;

    return { serie, atual };
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
      const saldoDevedor = calcularSaldoDevedor(Number(venda.valorFinal), totalPago);

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

// Soma `custo` nos dias [diaIni, diaFimExclusivo) do array de deltas.
// Recorta o intervalo para dentro da serie antes de aplicar.
function aplicarIntervalo(
  delta: number[],
  diaBase: number,
  totalDias: number,
  diaIni: number,
  diaFimExclusivo: number,
  custo: number
): void {
  const ini = Math.max(diaIni - diaBase, 0);
  const fim = Math.min(diaFimExclusivo - diaBase, totalDias);
  if (fim <= ini) return;
  delta[ini] = (delta[ini] ?? 0) + custo;
  delta[fim] = (delta[fim] ?? 0) - custo;
}
