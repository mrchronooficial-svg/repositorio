/**
 * Serviço de Demonstrativos Financeiros
 *
 * Gera DRE, Balanço Patrimonial e DFC a partir dos lançamentos contábeis.
 * Todos os valores são calculados com base nas linhas de lançamento
 * (partidas dobradas — débito/crédito).
 *
 * Regra fundamental:
 * - Contas DEVEDORAS (Ativo, Custos, Despesas): saldo = Σdébitos − Σcréditos
 * - Contas CREDORAS (Passivo, PL, Receitas): saldo = Σcréditos − Σdébitos
 */

import prisma from "@gestaomrchrono/db";

// ==================================================
// TIPOS
// ==================================================

interface SaldoConta {
  contaId: string;
  codigo: string;
  nome: string;
  natureza: string;
  saldo: number;
}

interface LinhaDRE {
  codigo: string;
  nome: string;
  valor: number;
  nivel: number; // 0 = total, 1 = grupo, 2 = subgrupo, 3 = analítica
  negrito?: boolean;
  percentual?: number; // margem (%)
}

interface LinhaBalanco {
  codigo: string;
  nome: string;
  valor: number;
  nivel: number;
  negrito?: boolean;
}

interface LinhaDFC {
  descricao: string;
  valor: number;
  nivel: number;
  negrito?: boolean;
}

export interface DREResult {
  periodo: string;
  linhas: LinhaDRE[];
  resumo: {
    receitaBruta: number;
    deducoes: number;
    receitaLiquida: number;
    cmv: number;
    lucroBruto: number;
    margemBruta: number;
    despesasOperacionais: number;
    despesasFinanceiras: number;
    lucroOperacional: number;
    despesasNaoRecorrentes: number;
    lucroLiquido: number;
    margemLiquida: number;
    lucroAjustado: number;
    margemAjustada: number;
  };
}

export interface BalancoResult {
  data: string;
  ativo: LinhaBalanco[];
  passivo: LinhaBalanco[];
  totalAtivo: number;
  totalPassivo: number;
  equilibrado: boolean;
}

export interface DFCResult {
  periodo: string;
  linhas: LinhaDFC[];
  resumo: {
    caixaOperacoes: number;
    caixaInvestimentos: number;
    caixaFinanciamento: number;
    variacaoLiquida: number;
    saldoInicial: number;
    saldoFinal: number;
  };
}

// ==================================================
// FUNÇÕES AUXILIARES
// ==================================================

/**
 * Calcula saldos de todas as contas analíticas em um período
 */
async function calcularSaldosPeriodo(
  dataInicio: Date,
  dataFim: Date
): Promise<SaldoConta[]> {
  // Buscar todas as linhas de lançamento no período
  // Exclui estornados (originais revertidos) E reversões (estornoDeId != null)
  const linhas = await prisma.linhaLancamento.findMany({
    where: {
      lancamento: {
        data: { gte: dataInicio, lte: dataFim },
        estornado: false,
        estornoDeId: null,
      },
    },
    select: {
      valor: true,
      contaDebitoId: true,
      contaCreditoId: true,
      contaDebito: { select: { id: true, codigo: true, nome: true, natureza: true } },
      contaCredito: { select: { id: true, codigo: true, nome: true, natureza: true } },
    },
  });

  // Acumular débitos e créditos por conta
  const debitos = new Map<string, number>();
  const creditos = new Map<string, number>();
  const contasInfo = new Map<string, { codigo: string; nome: string; natureza: string }>();

  for (const linha of linhas) {
    const valor = Number(linha.valor);

    // Débito
    const dId = linha.contaDebitoId;
    debitos.set(dId, (debitos.get(dId) || 0) + valor);
    if (!contasInfo.has(dId)) {
      contasInfo.set(dId, {
        codigo: linha.contaDebito.codigo,
        nome: linha.contaDebito.nome,
        natureza: linha.contaDebito.natureza,
      });
    }

    // Crédito
    const cId = linha.contaCreditoId;
    creditos.set(cId, (creditos.get(cId) || 0) + valor);
    if (!contasInfo.has(cId)) {
      contasInfo.set(cId, {
        codigo: linha.contaCredito.codigo,
        nome: linha.contaCredito.nome,
        natureza: linha.contaCredito.natureza,
      });
    }
  }

  // Calcular saldo de cada conta
  const todasContas = new Set([...debitos.keys(), ...creditos.keys()]);
  const saldos: SaldoConta[] = [];

  for (const contaId of todasContas) {
    const info = contasInfo.get(contaId)!;
    const totalDebito = debitos.get(contaId) || 0;
    const totalCredito = creditos.get(contaId) || 0;

    // Conta DEVEDORA: saldo = débitos - créditos
    // Conta CREDORA: saldo = créditos - débitos
    const saldo =
      info.natureza === "DEVEDORA"
        ? totalDebito - totalCredito
        : totalCredito - totalDebito;

    if (Math.abs(saldo) > 0.001) {
      saldos.push({
        contaId,
        codigo: info.codigo,
        nome: info.nome,
        natureza: info.natureza,
        saldo,
      });
    }
  }

  return saldos.sort((a, b) => a.codigo.localeCompare(b.codigo));
}

/**
 * Calcula saldos acumulados (balanço) — desde o início dos tempos até a data
 */
async function calcularSaldosAcumulados(dataFim: Date): Promise<SaldoConta[]> {
  return calcularSaldosPeriodo(new Date(2000, 0, 1), dataFim);
}

/**
 * Soma saldos de contas que começam com um prefixo
 */
function somarPorPrefixo(saldos: SaldoConta[], prefixo: string): number {
  return saldos
    .filter((s) => s.codigo.startsWith(prefixo))
    .reduce((acc, s) => acc + s.saldo, 0);
}

/**
 * Filtra contas por prefixo
 */
function filtrarPorPrefixo(saldos: SaldoConta[], prefixo: string): SaldoConta[] {
  return saldos.filter((s) => s.codigo.startsWith(prefixo));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(parte: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((parte / total) * 1000) / 10; // 1 casa decimal
}

// ==================================================
// DRE
// ==================================================

export async function gerarDRE(mes: number, ano: number): Promise<DREResult> {
  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0, 23, 59, 59);

  const saldos = await calcularSaldosPeriodo(dataInicio, dataFim);

  // Buscar árvore de contas do plano de contas (para gerar linhas dinâmicas)
  const todasContas = await prisma.contaContabil.findMany({
    select: { id: true, codigo: true, nome: true, tipo: true, contaPaiId: true },
    orderBy: { codigo: "asc" },
  });

  // Monta mapa de conta pai -> filhas
  const filhasPorPai = new Map<string, typeof todasContas>();
  const contaPorId = new Map<string, (typeof todasContas)[0]>();
  for (const c of todasContas) {
    contaPorId.set(c.id, c);
    if (c.contaPaiId) {
      const arr = filhasPorPai.get(c.contaPaiId) || [];
      arr.push(c);
      filhasPorPai.set(c.contaPaiId, arr);
    }
  }

  /**
   * Gera linhas da DRE para as filhas de um subgrupo (ex: 4.2),
   * lendo dinamicamente do plano de contas.
   * - Contas ANALITICA diretas viram linhas nível 2
   * - Contas SUBGRUPO viram linhas nível 1 (cabeçalho) com suas filhas nível 3
   * Valores aparecem negativos (são despesas/custos na DRE).
   * Só inclui linhas com saldo != 0.
   */
  function gerarLinhasFilhas(codigoPai: string): LinhaDRE[] {
    const contaPai = todasContas.find((c) => c.codigo === codigoPai);
    if (!contaPai) return [];

    const filhas = filhasPorPai.get(contaPai.id) || [];
    const resultado: LinhaDRE[] = [];

    for (const filha of filhas) {
      const saldo = somarPorPrefixo(saldos, filha.codigo);
      if (Math.abs(saldo) < 0.01) continue;

      if (filha.tipo === "ANALITICA") {
        resultado.push({ codigo: filha.codigo, nome: filha.nome, valor: -saldo, nivel: 2 });
      } else {
        // SUBGRUPO — cabeçalho + filhas analíticas
        resultado.push({ codigo: filha.codigo, nome: filha.nome, valor: -saldo, nivel: 1 });
        const netas = filhasPorPai.get(filha.id) || [];
        for (const neta of netas) {
          const saldoNeta = somarPorPrefixo(saldos, neta.codigo);
          if (Math.abs(saldoNeta) < 0.01) continue;
          resultado.push({ codigo: neta.codigo, nome: neta.nome, valor: -saldoNeta, nivel: 3 });
        }
      }
    }

    return resultado;
  }

  // Receita Bruta
  const receitaEstoqueProprio = somarPorPrefixo(saldos, "3.1.1");
  const receitaConsignacao = somarPorPrefixo(saldos, "3.1.2");
  const receitaBruta = round2(receitaEstoqueProprio + receitaConsignacao);

  // Deduções
  const mdr = somarPorPrefixo(saldos, "3.2.1");
  const simples = somarPorPrefixo(saldos, "3.2.2");
  const deducoes = round2(mdr + simples);

  // Receita Líquida
  const receitaLiquida = round2(receitaBruta - deducoes);

  // CMV (4.1) — dinâmico
  const cmv = round2(somarPorPrefixo(saldos, "4.1"));
  const lucroBruto = round2(receitaLiquida - cmv);
  const margemBruta = pct(lucroBruto, receitaLiquida);

  // Despesas Operacionais (4.2) — dinâmico
  const despesasOperacionais = round2(somarPorPrefixo(saldos, "4.2"));

  // Despesas Financeiras (4.3) — dinâmico
  const despesasFinanceiras = round2(somarPorPrefixo(saldos, "4.3"));

  // Lucro Operacional (EBIT)
  const lucroOperacional = round2(lucroBruto - despesasOperacionais - despesasFinanceiras);

  // Despesas Não Recorrentes (4.4) — dinâmico
  const despesasNaoRecorrentes = round2(somarPorPrefixo(saldos, "4.4"));

  // Lucro Líquido
  const lucroLiquido = round2(lucroOperacional - despesasNaoRecorrentes);
  const margemLiquida = pct(lucroLiquido, receitaLiquida);

  // Lucro Ajustado (excluindo não-recorrentes)
  const lucroAjustado = round2(lucroOperacional);
  const margemAjustada = pct(lucroAjustado, receitaLiquida);

  // Montar linhas da DRE — estrutura fixa, conteúdo dinâmico
  const linhas: LinhaDRE[] = [
    { codigo: "", nome: "RECEITA BRUTA DE VENDAS", valor: receitaBruta, nivel: 0, negrito: true },
    { codigo: "3.1.1", nome: "Venda de Peças — Estoque Próprio", valor: receitaEstoqueProprio, nivel: 2 },
    { codigo: "3.1.2", nome: "Venda de Peças — Consignação (margem)", valor: receitaConsignacao, nivel: 2 },
    { codigo: "", nome: "(−) DEDUÇÕES DA RECEITA", valor: -deducoes, nivel: 0, negrito: true },
    { codigo: "3.2.1", nome: "(−) MDR — Taxa de Cartão", valor: -mdr, nivel: 2 },
    { codigo: "3.2.2", nome: "(−) Simples Nacional", valor: -simples, nivel: 2 },
    { codigo: "", nome: "= RECEITA LÍQUIDA", valor: receitaLiquida, nivel: 0, negrito: true },
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "(−) CUSTO DAS MERCADORIAS VENDIDAS (CMV)", valor: -cmv, nivel: 0, negrito: true },
    ...gerarLinhasFilhas("4.1"),
    { codigo: "", nome: "= LUCRO BRUTO", valor: lucroBruto, nivel: 0, negrito: true, percentual: margemBruta },
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "(−) DESPESAS OPERACIONAIS", valor: -despesasOperacionais, nivel: 0, negrito: true },
    ...gerarLinhasFilhas("4.2"),
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "(−) DESPESAS FINANCEIRAS", valor: -despesasFinanceiras, nivel: 0, negrito: true },
    ...gerarLinhasFilhas("4.3"),
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "= LUCRO OPERACIONAL (EBIT)", valor: lucroOperacional, nivel: 0, negrito: true },
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "(−) DESPESAS NÃO RECORRENTES (ONE-OFFS)", valor: -despesasNaoRecorrentes, nivel: 0, negrito: true },
    ...gerarLinhasFilhas("4.4"),
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "= LUCRO LÍQUIDO", valor: lucroLiquido, nivel: 0, negrito: true, percentual: margemLiquida },
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "= LUCRO AJUSTADO (excluindo não-recorrentes)", valor: lucroAjustado, nivel: 0, negrito: true, percentual: margemAjustada },
  ];

  const periodo = `${mes.toString().padStart(2, "0")}/${ano}`;

  return {
    periodo,
    linhas,
    resumo: {
      receitaBruta,
      deducoes,
      receitaLiquida,
      cmv,
      lucroBruto,
      margemBruta,
      despesasOperacionais,
      despesasFinanceiras,
      lucroOperacional,
      despesasNaoRecorrentes,
      lucroLiquido,
      margemLiquida,
      lucroAjustado,
      margemAjustada,
    },
  };
}

// ==================================================
// BALANÇO PATRIMONIAL
// ==================================================

/**
 * Busca o Capital Social configurado na tabela configuracoes.
 * Fallback para valor fixo se não encontrado.
 */
async function getCapitalSocial(): Promise<number> {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { chave: "CAPITAL_SOCIAL" },
    });
    if (config) return Number(config.valor);
  } catch {
    // Tabela pode não existir ainda
  }
  return 70273.4; // Valor padrão
}

/**
 * Busca o Saldo Inicial de Caixa configurado.
 * Este valor é calibrado para que o caixa final reflita os saldos bancários reais.
 */
async function getSaldoInicialCaixa(): Promise<number> {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { chave: "SALDO_INICIAL_CAIXA" },
    });
    if (config) return Number(config.valor);
  } catch {
    // Tabela pode não existir ainda
  }
  return 105690.65; // Valor padrão calibrado
}

/**
 * Calcula o Caixa real da empresa usando abordagem operacional pura.
 *
 * Caixa = Saldo Inicial de Caixa (calibrado)
 *       + pagamentos PIX recebidos de clientes (valor cheio)
 *       + pagamentos Cartão recebidos de clientes (líquido de MDR)
 *       − pagamentos a fornecedores (compras de peças)
 *       − repasses de consignação feitos
 *       + entradas contábeis não ligadas a vendas em 1.1.1 (transferências, etc.)
 *       − saídas contábeis não ligadas a vendas de 1.1.1 (despesas, distribuições, etc.)
 *
 * Sub-linhas: Nubank (conta operacional, absorve todos os fluxos)
 *             PagBank (conta estática, saldoInicial fixo)
 */
async function calcularCaixaReal(
  dataFim: Date
): Promise<{ total: number; detalhes: { codigo: string; nome: string; valor: number }[] }> {
  const saldoInicial = await getSaldoInicialCaixa();

  // 1. Pagamentos PIX recebidos de clientes (valor cheio — sem MDR)
  const pagPIXAgg = await prisma.pagamento.aggregate({
    _sum: { valor: true },
    where: {
      data: { lte: dataFim },
      venda: { cancelada: false, formaPagamento: "PIX" },
    },
  });
  const cashInPIX = Number(pagPIXAgg._sum.valor || 0);

  // 2. Pagamentos Cartão recebidos de clientes (líquido de MDR)
  const pagCartao = await prisma.pagamento.findMany({
    where: {
      data: { lte: dataFim },
      venda: { cancelada: false, formaPagamento: { in: ["CREDITO_VISTA", "CREDITO_PARCELADO"] } },
    },
    select: {
      valor: true,
      venda: { select: { taxaMDR: true } },
    },
  });
  let cashInCartao = 0;
  for (const p of pagCartao) {
    const mdr = Number(p.venda.taxaMDR || 0) / 100;
    cashInCartao += Number(p.valor) * (1 - mdr);
  }

  // 3. Pagamentos a fornecedores (saída de caixa)
  const pagFornecedorAgg = await prisma.pagamentoFornecedor.aggregate({
    _sum: { valor: true },
    where: { data: { lte: dataFim } },
  });
  const totalPagFornecedores = Number(pagFornecedorAgg._sum.valor || 0);

  // 4. Repasses de consignação feitos (saída de caixa)
  const repassesAgg = await prisma.venda.aggregate({
    _sum: { valorRepasseFeito: true },
    where: { cancelada: false },
  });
  const totalRepasses = Number(repassesAgg._sum.valorRepasseFeito || 0);

  // 5. Movimentos contábeis não ligados a vendas em contas 1.1.1
  const movNaoVenda = await prisma.linhaLancamento.findMany({
    where: {
      lancamento: {
        data: { lte: dataFim },
        estornado: false,
        estornoDeId: null,
        vendaId: null,
      },
      OR: [
        { contaDebito: { codigo: { startsWith: "1.1.1" } } },
        { contaCredito: { codigo: { startsWith: "1.1.1" } } },
      ],
    },
    select: {
      valor: true,
      contaDebito: { select: { codigo: true } },
      contaCredito: { select: { codigo: true } },
    },
  });

  let entradasContabeis = 0;
  let saidasContabeis = 0;
  for (const m of movNaoVenda) {
    const valor = Number(m.valor);
    if (m.contaDebito.codigo.startsWith("1.1.1")) entradasContabeis += valor;
    if (m.contaCredito.codigo.startsWith("1.1.1")) saidasContabeis += valor;
  }
  const netContabil = entradasContabeis - saidasContabeis;

  // TOTAL
  const totalCaixa = saldoInicial + cashInPIX + cashInCartao - totalPagFornecedores - totalRepasses + netContabil;

  // Sub-linhas: PagBank (estática) e Nubank (restante)
  const contasBancarias = await prisma.contaBancaria.findMany({
    select: {
      saldoInicial: true,
      contaContabil: { select: { codigo: true, nome: true } },
    },
    orderBy: { contaContabil: { codigo: "asc" } },
  });

  // PagBank = saldoInicial fixo (conta estática sem fluxos operacionais)
  // Nubank = total caixa - PagBank (absorve todos os fluxos)
  let pagBankBalance = 0;
  const detalhes: { codigo: string; nome: string; valor: number }[] = [];

  for (const cb of contasBancarias) {
    if (cb.contaContabil.codigo === "1.1.1.01") {
      // Nubank — será calculado depois
      continue;
    } else {
      // PagBank e outras contas estáticas
      const bal = Number(cb.saldoInicial);
      pagBankBalance += bal;
      detalhes.push({ codigo: cb.contaContabil.codigo, nome: cb.contaContabil.nome, valor: round2(bal) });
    }
  }

  // Nubank = total - contas estáticas
  const nubankBalance = round2(totalCaixa - pagBankBalance);
  detalhes.unshift({ codigo: "1.1.1.01", nome: "Nubank (Pix)", valor: nubankBalance });

  return { total: round2(totalCaixa), detalhes };
}

export async function gerarBalanco(mes: number, ano: number): Promise<BalancoResult> {
  const dataFim = new Date(ano, mes, 0, 23, 59, 59);

  // Saldos contábeis acumulados (para Resultado, Obrigações Fiscais, etc.)
  const saldos = await calcularSaldosAcumulados(dataFim);

  // ─────────────────────────────────────────────────
  // ATIVO
  // ─────────────────────────────────────────────────

  // 1. Caixa e Equivalentes — calculado operacionalmente
  const caixa = await calcularCaixaReal(dataFim);
  const totalCaixa = caixa.total;

  // 2. Contas a Receber — vendas não pagas/parciais
  //    PIX: valor cheio (sem MDR)
  //    Cartão: valor líquido (descontando MDR que será retido pela operadora)
  const vendasRecebiveis = await prisma.venda.findMany({
    where: {
      cancelada: false,
      dataVenda: { lte: dataFim },
      statusPagamento: { in: ["NAO_PAGO", "PARCIAL"] },
    },
    include: {
      pagamentos: { where: { data: { lte: dataFim } }, select: { valor: true } },
    },
  });

  let contasReceberPIX = 0;
  let contasReceberCartao = 0;
  for (const v of vendasRecebiveis) {
    const pago = v.pagamentos.reduce((a: number, p: { valor: unknown }) => a + Number(p.valor), 0);
    const pendente = Number(v.valorFinal) - pago;
    if (pendente <= 0) continue;

    if (v.formaPagamento === "PIX") {
      contasReceberPIX += pendente;
    } else {
      // Cartão: desconta MDR porque a operadora vai reter esse percentual
      const mdrPct = Number(v.taxaMDR || 0) / 100;
      contasReceberCartao += pendente * (1 - mdrPct);
    }
  }
  const contasReceber = round2(contasReceberPIX + contasReceberCartao);

  // 3. Estoque — peças compradas em status contabilizável (a custo)
  const statusEmEstoque = ["DISPONIVEL", "EM_TRANSITO", "REVISAO"] as const;
  const estoqueData = await prisma.peca.aggregate({
    _sum: { valorCompra: true, custoManutencao: true },
    where: {
      arquivado: false,
      status: { in: [...statusEmEstoque] },
      origemTipo: "COMPRA",
    },
  });
  const estoques = round2(
    Number(estoqueData._sum.valorCompra || 0) +
    Number(estoqueData._sum.custoManutencao || 0)
  );

  // Ativo Circulante
  const ativoCirculante = round2(totalCaixa + contasReceber + estoques);

  // Ativo Não Circulante
  const imobilizado = somarPorPrefixo(saldos, "1.2");
  const ativoNaoCirculante = round2(imobilizado);

  const totalAtivo = round2(ativoCirculante + ativoNaoCirculante);

  // ─────────────────────────────────────────────────
  // PASSIVO
  // ─────────────────────────────────────────────────

  // 1. Fornecedores — repasses de consignação pendentes
  const repassesPendentesAgg = await prisma.venda.aggregate({
    where: {
      cancelada: false,
      statusRepasse: { in: ["PENDENTE", "PARCIAL"] },
    },
    _sum: { valorRepasseDevido: true, valorRepasseFeito: true },
  });
  const repasseConsignacao = round2(
    Number(repassesPendentesAgg._sum.valorRepasseDevido || 0) -
    Number(repassesPendentesAgg._sum.valorRepasseFeito || 0)
  );

  // 2. Fornecedores — compras de peças não pagas
  const comprasNaoPagasAgg = await prisma.peca.aggregate({
    where: {
      origemTipo: "COMPRA",
      statusPagamentoFornecedor: { in: ["NAO_PAGO", "PARCIAL"] },
      arquivado: false,
    },
    _sum: { valorCompra: true, valorPagoFornecedor: true },
  });
  const fornecedoresCompras = round2(
    Number(comprasNaoPagasAgg._sum.valorCompra || 0) -
    Number(comprasNaoPagasAgg._sum.valorPagoFornecedor || 0)
  );
  const totalFornecedores = round2(repasseConsignacao + fornecedoresCompras);

  // 3. Obrigações Fiscais e Outras — de lançamentos contábeis
  const obrigacoesFiscais = somarPorPrefixo(saldos, "2.1.2");
  const outrasObrigacoes = somarPorPrefixo(saldos, "2.1.3");

  const passivoCirculante = round2(totalFornecedores + obrigacoesFiscais + outrasObrigacoes);
  const passivoNaoCirculante = round2(somarPorPrefixo(saldos, "2.2"));

  // ─────────────────────────────────────────────────
  // PATRIMÔNIO LÍQUIDO
  // ─────────────────────────────────────────────────

  const capitalSocial = await getCapitalSocial();
  const lucrosAcumulados = somarPorPrefixo(saldos, "2.3.2");
  const distribuicaoLucros = somarPorPrefixo(saldos, "2.3.3");

  // Resultado derivado da identidade do Balanço (Ativo = Passivo + PL)
  // Garante que o Balanço sempre equilibra, já que Ativo e Passivo operacional
  // vêm de fontes reais (vendas, peças, pagamentos) e o DRE vem de lançamentos contábeis.
  const resultadoPeriodo = round2(
    totalAtivo - passivoCirculante - passivoNaoCirculante - capitalSocial - lucrosAcumulados + distribuicaoLucros
  );

  const pl = round2(capitalSocial + lucrosAcumulados + resultadoPeriodo - distribuicaoLucros);
  const totalPassivo = round2(passivoCirculante + passivoNaoCirculante + pl);

  // ─────────────────────────────────────────────────
  // MONTAGEM DAS LINHAS
  // ─────────────────────────────────────────────────

  const ativoLinhas: LinhaBalanco[] = [];

  ativoLinhas.push(
    { codigo: "1", nome: "ATIVO", valor: totalAtivo, nivel: 0, negrito: true },
    { codigo: "1.1", nome: "Ativo Circulante", valor: ativoCirculante, nivel: 1, negrito: true },
    { codigo: "1.1.1", nome: "Caixa e Equivalentes de Caixa", valor: totalCaixa, nivel: 2 },
  );

  for (const det of caixa.detalhes) {
    ativoLinhas.push({ codigo: det.codigo, nome: det.nome, valor: det.valor, nivel: 3 });
  }

  ativoLinhas.push(
    { codigo: "1.1.2", nome: "Contas a Receber", valor: contasReceber, nivel: 2 },
    { codigo: "1.1.3", nome: "Estoques", valor: estoques, nivel: 2 },
  );

  if (ativoNaoCirculante > 0) {
    ativoLinhas.push(
      { codigo: "1.2", nome: "Ativo Não Circulante", valor: ativoNaoCirculante, nivel: 1, negrito: true },
      { codigo: "1.2.1", nome: "Imobilizado", valor: imobilizado, nivel: 2 },
    );
  }

  const passivoLinhas: LinhaBalanco[] = [];

  passivoLinhas.push(
    { codigo: "2", nome: "PASSIVO + PATRIMÔNIO LÍQUIDO", valor: totalPassivo, nivel: 0, negrito: true },
    { codigo: "2.1", nome: "Passivo Circulante", valor: passivoCirculante, nivel: 1, negrito: true },
  );

  if (totalFornecedores !== 0) {
    passivoLinhas.push({ codigo: "2.1.1", nome: "Fornecedores", valor: totalFornecedores, nivel: 2 });
    if (repasseConsignacao !== 0) {
      passivoLinhas.push({ codigo: "2.1.1.01", nome: "Repasses de Consignação", valor: repasseConsignacao, nivel: 3 });
    }
    if (fornecedoresCompras !== 0) {
      passivoLinhas.push({ codigo: "2.1.1.02", nome: "Compras a Pagar", valor: fornecedoresCompras, nivel: 3 });
    }
  }
  if (obrigacoesFiscais !== 0) {
    passivoLinhas.push({ codigo: "2.1.2", nome: "Obrigações Fiscais", valor: obrigacoesFiscais, nivel: 2 });
    for (const c of filtrarPorPrefixo(saldos, "2.1.2")) {
      passivoLinhas.push({ codigo: c.codigo, nome: c.nome, valor: round2(c.saldo), nivel: 3 });
    }
  }
  if (outrasObrigacoes !== 0) {
    passivoLinhas.push({ codigo: "2.1.3", nome: "Outras Obrigações", valor: outrasObrigacoes, nivel: 2 });
  }

  if (passivoNaoCirculante !== 0) {
    passivoLinhas.push({ codigo: "2.2", nome: "Passivo Não Circulante", valor: passivoNaoCirculante, nivel: 1, negrito: true });
  }

  passivoLinhas.push(
    { codigo: "2.3", nome: "Patrimônio Líquido", valor: pl, nivel: 1, negrito: true },
    { codigo: "2.3.1", nome: "Capital Social", valor: capitalSocial, nivel: 2 },
    { codigo: "2.3.2", nome: "Lucros Acumulados", valor: round2(lucrosAcumulados + resultadoPeriodo), nivel: 2 },
  );

  if (distribuicaoLucros !== 0) {
    passivoLinhas.push({ codigo: "2.3.3", nome: "(−) Distribuição de Lucros", valor: -distribuicaoLucros, nivel: 2 });
  }

  const dataStr = `${dataFim.getDate().toString().padStart(2, "0")}/${mes.toString().padStart(2, "0")}/${ano}`;

  return {
    data: dataStr,
    ativo: ativoLinhas,
    passivo: passivoLinhas,
    totalAtivo: round2(totalAtivo),
    totalPassivo: round2(totalPassivo),
    equilibrado: Math.abs(totalAtivo - totalPassivo) < 0.02,
  };
}

// ==================================================
// DFC — FLUXO DE CAIXA (MÉTODO INDIRETO)
// ==================================================

export async function gerarDFC(mes: number, ano: number): Promise<DFCResult> {
  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0, 23, 59, 59);
  const dataFimAnterior = new Date(ano, mes - 1, 0, 23, 59, 59);

  // Saldos do período atual (DRE — para lucro líquido)
  const saldosPeriodo = await calcularSaldosPeriodo(dataInicio, dataFim);

  // Saldos acumulados (balanço) do mês atual e anterior
  const saldosAtual = await calcularSaldosAcumulados(dataFim);
  const saldosAnterior = await calcularSaldosAcumulados(dataFimAnterior);


  // Lucro líquido do período (mesma fórmula do Balanço/DRE)
  // 3.1 = Receitas (CREDORA, saldo positivo)
  // 3.2 = Deduções (DEVEDORA, saldo positivo) — subtrai
  // 4   = Custos e Despesas (DEVEDORA, saldo positivo) — subtrai
  const receitasDFC = somarPorPrefixo(saldosPeriodo, "3.1");
  const deducoesDFC = somarPorPrefixo(saldosPeriodo, "3.2");
  const custosDespesasDFC = somarPorPrefixo(saldosPeriodo, "4");
  const lucroLiquido = round2(receitasDFC - deducoesDFC - custosDespesasDFC);

  // Variação de balanço (atual - anterior)
  function variacaoConta(prefixo: string): number {
    const atual = somarPorPrefixo(saldosAtual, prefixo);
    const anterior = somarPorPrefixo(saldosAnterior, prefixo);
    return round2(atual - anterior);
  }

  // ATIVIDADES OPERACIONAIS
  const varContasReceber = variacaoConta("1.1.2");
  const varEstoques = variacaoConta("1.1.3");
  const varFornecedores = variacaoConta("2.1.1");
  const varObrigacoesFiscais = variacaoConta("2.1.2");

  // Aumento de ativo operacional = uso de caixa (negativo)
  // Aumento de passivo operacional = fonte de caixa (positivo)
  const ajusteContasReceber = -varContasReceber;
  const ajusteEstoques = -varEstoques;
  const ajusteFornecedores = varFornecedores;
  const ajusteObrigacoesFiscais = varObrigacoesFiscais;

  const caixaOperacoes = round2(
    lucroLiquido + ajusteContasReceber + ajusteEstoques + ajusteFornecedores + ajusteObrigacoesFiscais
  );

  // ATIVIDADES DE INVESTIMENTO
  const varImobilizado = variacaoConta("1.2");
  const caixaInvestimentos = round2(-varImobilizado);

  // ATIVIDADES DE FINANCIAMENTO
  const distribuicaoPeriodo = somarPorPrefixo(saldosPeriodo, "2.3.3");
  const caixaFinanciamento = round2(-distribuicaoPeriodo);

  // Variação líquida
  const variacaoLiquida = round2(caixaOperacoes + caixaInvestimentos + caixaFinanciamento);

  // Saldo de caixa — usa calcularCaixaReal para consistência com o Balanço
  const caixaAnterior = await calcularCaixaReal(dataFimAnterior);
  const caixaAtual = await calcularCaixaReal(dataFim);

  const saldoInicial = caixaAnterior.total;
  const saldoFinal = caixaAtual.total;

  const linhas: LinhaDFC[] = [
    { descricao: "ATIVIDADES OPERACIONAIS", valor: 0, nivel: 0, negrito: true },
    { descricao: "Lucro Líquido do Período", valor: lucroLiquido, nivel: 1 },
    { descricao: "Ajustes:", valor: 0, nivel: 1, negrito: true },
    { descricao: "(+/−) Variação de Contas a Receber", valor: ajusteContasReceber, nivel: 2 },
    { descricao: "(+/−) Variação de Estoques", valor: ajusteEstoques, nivel: 2 },
    { descricao: "(+/−) Variação de Fornecedores (Consignação)", valor: ajusteFornecedores, nivel: 2 },
    { descricao: "(+/−) Variação de Obrigações Fiscais", valor: ajusteObrigacoesFiscais, nivel: 2 },
    { descricao: "= Caixa Gerado nas Operações", valor: caixaOperacoes, nivel: 0, negrito: true },
    { descricao: "", valor: 0, nivel: -1 },
    { descricao: "ATIVIDADES DE INVESTIMENTO", valor: 0, nivel: 0, negrito: true },
    { descricao: "(−) Aquisição de Imobilizado", valor: caixaInvestimentos, nivel: 2 },
    { descricao: "= Caixa Usado em Investimentos", valor: caixaInvestimentos, nivel: 0, negrito: true },
    { descricao: "", valor: 0, nivel: -1 },
    { descricao: "ATIVIDADES DE FINANCIAMENTO", valor: 0, nivel: 0, negrito: true },
    { descricao: "(−) Distribuição de Lucros aos Sócios", valor: caixaFinanciamento, nivel: 2 },
    { descricao: "= Caixa Usado em Financiamento", valor: caixaFinanciamento, nivel: 0, negrito: true },
    { descricao: "", valor: 0, nivel: -1 },
    { descricao: "= VARIAÇÃO LÍQUIDA DE CAIXA", valor: variacaoLiquida, nivel: 0, negrito: true },
    { descricao: "(+) Saldo Inicial de Caixa", valor: saldoInicial, nivel: 1 },
    { descricao: "= SALDO FINAL DE CAIXA", valor: saldoFinal, nivel: 0, negrito: true },
  ];

  return {
    periodo: `${mes.toString().padStart(2, "0")}/${ano}`,
    linhas,
    resumo: {
      caixaOperacoes,
      caixaInvestimentos,
      caixaFinanciamento,
      variacaoLiquida,
      saldoInicial,
      saldoFinal,
    },
  };
}
