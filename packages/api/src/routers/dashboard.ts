import { protectedProcedure, router } from "../index";
import prisma from "@gestaomrchrono/db";
import {
  calcularRBT12,
  calcularImpostoVenda,
} from "../services/simples-nacional.service";
import { gerarDRE } from "../services/demonstrativos.service";

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
      _pecasVendidasMes,
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
        abaixoIdeal: pecasEmEstoque < estoqueIdeal,
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
            dataVenda: { gte: inicioMesAnterior, lte: fimMesAnterior },
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

        // Buscar configuração de alíquota do Simples
        const configAliquota = await prisma.configuracao.findUnique({
          where: { chave: "ALIQUOTA_SIMPLES" },
        });
        const aliquotaConfig = configAliquota?.valor || "auto";

        // Se automático, calcular RBT12 uma vez para todas as vendas do mês
        let rbt12: number | null = null;
        if (aliquotaConfig === "auto" && vendasMesResult.length > 0) {
          rbt12 = await calcularRBT12();
        }

        lucroBrutoMes = vendasMesResult.reduce((total, v) => {
          const valorFinal = Number(v.valorFinal) || 0;
          const origemTipo = v.peca.origemTipo;
          const custoManutencao = Number(v.peca.custoManutencao) || 0;

          // 1. Margem bruta base (receita - custo de aquisição/repasse)
          let lucroVenda: number;
          let baseSimples: number;
          if (origemTipo === "CONSIGNACAO") {
            const valorRepasse = Number(v.valorRepasseDevido) || 0;
            lucroVenda = valorFinal - valorRepasse;
            baseSimples = valorFinal - valorRepasse; // margem
          } else {
            const valorCompra = Number(v.peca.valorCompra) || 0;
            lucroVenda = valorFinal - valorCompra;
            baseSimples = valorFinal; // valor total da venda
          }

          // 2. Deduzir MDR (taxa de cartão)
          const taxaMDR = Number(v.taxaMDR) || 0;
          if (v.formaPagamento !== "PIX" && taxaMDR > 0) {
            const valorMDR = Math.round(valorFinal * (taxaMDR / 100) * 100) / 100;
            lucroVenda -= valorMDR;
          }

          // 3. Deduzir Simples Nacional
          if (aliquotaConfig !== "auto") {
            const aliquotaEfetiva = parseFloat(aliquotaConfig) / 100;
            lucroVenda -= Math.round(baseSimples * aliquotaEfetiva * 100) / 100;
          } else if (rbt12 !== null) {
            const { valorImposto } = calcularImpostoVenda(baseSimples, rbt12);
            lucroVenda -= valorImposto;
          }

          // 4. Deduzir custo de manutenção (relojoeiro/restauro)
          lucroVenda -= custoManutencao;

          return total + lucroVenda;
        }, 0);

        margemBrutaMes =
          somaValorFinal > 0
            ? Math.round((lucroBrutoMes / somaValorFinal) * 1000) / 10
            : 0;

        lucroBrutoPorPeca =
          vendasMesResult.length > 0
            ? Math.round((lucroBrutoMes / vendasMesResult.length) * 100) / 100
            : 0;
      }

      // Lucro Líquido via DRE (apenas admin)
      let lucroLiquidoMes: number | null = null;
      let lucroLiquidoPorPeca: number | null = null;

      if (userNivel === "ADMINISTRADOR") {
        try {
          const dre = await gerarDRE(hoje.getMonth() + 1, hoje.getFullYear());
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

      const [countVendas, vendasDoMes] = await Promise.all([
        prisma.venda.count({
          where: {
            dataVenda: { gte: inicioMes, lte: fimMes },
            cancelada: false,
          },
        }),
        podeVerValores
          ? prisma.venda.findMany({
              where: {
                dataVenda: { gte: inicioMes, lte: fimMes },
                cancelada: false,
              },
              select: { valorFinal: true, valorRepasseDevido: true },
            })
          : null,
      ]);

      // Calcular faturamento real (consignação = margem)
      let faturamento: number | null = null;
      if (vendasDoMes) {
        faturamento = vendasDoMes.reduce((total, v) => {
          const valorFinal = Number(v.valorFinal) || 0;
          const valorRepasse = Number(v.valorRepasseDevido) || 0;
          return total + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
        }, 0);
      }

      const nomeMes = inicioMes.toLocaleDateString("pt-BR", { month: "short" });

      meses.push({
        mes: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
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

  // Metricas de valor do estoque
  getMetricasValorEstoque: protectedProcedure.query(async ({ ctx }) => {
    const userNivel = ctx.session.user.nivel;
    if (userNivel === "FUNCIONARIO") {
      return null;
    }

    // Status que contam como "em estoque"
    const statusEmEstoque = ["DISPONIVEL", "EM_TRANSITO", "REVISAO"] as const;

    // Total de pecas (todos os status, nao arquivadas)
    const totalPecas = await prisma.peca.count({
      where: {
        arquivado: false,
        status: { in: [...statusEmEstoque] },
      },
    });

    // Valor em custo (apenas pecas COMPRADAS - consignado nao teve gasto de caixa)
    const custoEstoque = await prisma.peca.aggregate({
      _sum: { valorCompra: true },
      where: {
        arquivado: false,
        status: { in: [...statusEmEstoque] },
        origemTipo: "COMPRA",
      },
    });

    // Valor em faturamento (soma do valor estimado de venda de todas as pecas em estoque)
    const faturamentoEstoque = await prisma.peca.aggregate({
      _sum: { valorEstimadoVenda: true },
      where: {
        arquivado: false,
        status: { in: [...statusEmEstoque] },
      },
    });

    return {
      totalPecas,
      valorCusto: Number(custoEstoque._sum.valorCompra) || 0,
      valorFaturamento: Number(faturamentoEstoque._sum.valorEstimadoVenda) || 0,
    };
  }),

  // Pace de vendas diario por mes (cumulativo)
  getPaceVendas: protectedProcedure.query(async () => {
    const hoje = new Date();
    const mesesAtras = 9;
    // Sistema começou em Fev/2025, não buscar dados anteriores
    const inicioSistema = new Date(2025, 1, 1); // Fev 2025
    const inicioCalc = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras + 1, 1);
    const inicio = inicioCalc > inicioSistema ? inicioCalc : inicioSistema;

    const vendas = await prisma.venda.findMany({
      where: {
        cancelada: false,
        dataVenda: { gte: inicio },
      },
      select: { dataVenda: true },
      orderBy: { dataVenda: "asc" },
    });

    // Agrupar por ano-mes, depois contar por dia
    const mesesMap = new Map<string, { mes: string; ano: number; contagemPorDia: Map<number, number> }>();
    const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (const v of vendas) {
      const d = new Date(v.dataVenda);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!mesesMap.has(key)) {
        mesesMap.set(key, {
          mes: nomesMeses[d.getMonth()]!,
          ano: d.getFullYear(),
          contagemPorDia: new Map(),
        });
      }
      const entry = mesesMap.get(key)!;
      const dia = d.getDate();
      entry.contagemPorDia.set(dia, (entry.contagemPorDia.get(dia) || 0) + 1);
    }

    // Converter para formato cumulativo
    const resultado = Array.from(mesesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, entry]) => {
        const dados: Array<{ dia: number; acumulado: number }> = [];
        let acumulado = 0;
        // Descobrir o ultimo dia do mes
        const mesIdx = nomesMeses.indexOf(entry.mes);
        const ultimoDia = new Date(entry.ano, mesIdx + 1, 0).getDate();
        for (let dia = 1; dia <= ultimoDia; dia++) {
          acumulado += entry.contagemPorDia.get(dia) || 0;
          dados.push({ dia, acumulado });
        }
        return { mes: entry.mes, ano: entry.ano, dados };
      });

    return resultado;
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
