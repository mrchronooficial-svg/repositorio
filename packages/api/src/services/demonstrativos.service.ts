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

  // CMV
  const cmvLeilao = somarPorPrefixo(saldos, "4.1.1");
  const cmvEbay = somarPorPrefixo(saldos, "4.1.2");
  const cmvPF = somarPorPrefixo(saldos, "4.1.3");
  const cmvManutencao = somarPorPrefixo(saldos, "4.1.4");
  const cmv = round2(cmvLeilao + cmvEbay + cmvPF + cmvManutencao);

  // Lucro Bruto
  const lucroBruto = round2(receitaLiquida - cmv);
  const margemBruta = pct(lucroBruto, receitaLiquida);

  // Despesas Operacionais (4.2.x)
  const despAds = somarPorPrefixo(saldos, "4.2.1");
  const despFrete = somarPorPrefixo(saldos, "4.2.2");
  const despEditor = somarPorPrefixo(saldos, "4.2.3");
  const despContabilidade = somarPorPrefixo(saldos, "4.2.4");
  const despDacto = somarPorPrefixo(saldos, "4.2.5");
  const despManychat = somarPorPrefixo(saldos, "4.2.6.01");
  const despPoli = somarPorPrefixo(saldos, "4.2.6.02");
  const despMLC = somarPorPrefixo(saldos, "4.2.6.03");
  const despFerramentas = somarPorPrefixo(saldos, "4.2.6");
  const despMateriais = somarPorPrefixo(saldos, "4.2.7");
  const despOutrasRecorrentes = somarPorPrefixo(saldos, "4.2.8");
  const despesasOperacionais = round2(somarPorPrefixo(saldos, "4.2"));

  // Despesas Financeiras (4.3.x)
  const despAntecipacao = somarPorPrefixo(saldos, "4.3.1");
  const despesasFinanceiras = round2(somarPorPrefixo(saldos, "4.3"));

  // Lucro Operacional (EBIT)
  const lucroOperacional = round2(lucroBruto - despesasOperacionais - despesasFinanceiras);

  // Despesas Não Recorrentes (4.4.x)
  const despNaoRecorrentes = somarPorPrefixo(saldos, "4.4.1");
  const despesasNaoRecorrentes = round2(somarPorPrefixo(saldos, "4.4"));

  // Lucro Líquido
  const lucroLiquido = round2(lucroOperacional - despesasNaoRecorrentes);
  const margemLiquida = pct(lucroLiquido, receitaLiquida);

  // Lucro Ajustado (excluindo não-recorrentes)
  const lucroAjustado = round2(lucroOperacional);
  const margemAjustada = pct(lucroAjustado, receitaLiquida);

  // Montar linhas da DRE
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
    { codigo: "4.1.1", nome: "Custo de Aquisição — Leilão", valor: -cmvLeilao, nivel: 2 },
    { codigo: "4.1.2", nome: "Custo de Aquisição — eBay", valor: -cmvEbay, nivel: 2 },
    { codigo: "4.1.3", nome: "Custo de Aquisição — Pessoa Física", valor: -cmvPF, nivel: 2 },
    { codigo: "4.1.4", nome: "Manutenção e Restauro", valor: -cmvManutencao, nivel: 2 },
    { codigo: "", nome: "= LUCRO BRUTO", valor: lucroBruto, nivel: 0, negrito: true, percentual: margemBruta },
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "(−) DESPESAS OPERACIONAIS", valor: -despesasOperacionais, nivel: 0, negrito: true },
    { codigo: "4.2.1", nome: "Marketing e Publicidade (Ads)", valor: -despAds, nivel: 2 },
    { codigo: "4.2.2", nome: "Frete de Envio ao Cliente", valor: -despFrete, nivel: 2 },
    { codigo: "4.2.3", nome: "Editor de Vídeo", valor: -despEditor, nivel: 2 },
    { codigo: "4.2.4", nome: "Contabilidade", valor: -despContabilidade, nivel: 2 },
    { codigo: "4.2.5", nome: "Dacto", valor: -despDacto, nivel: 2 },
    { codigo: "4.2.6", nome: "Ferramentas e Sistemas", valor: -despFerramentas, nivel: 1 },
    { codigo: "4.2.6.01", nome: "Manychat", valor: -despManychat, nivel: 3 },
    { codigo: "4.2.6.02", nome: "Poli Digital", valor: -despPoli, nivel: 3 },
    { codigo: "4.2.6.03", nome: "Minha Loja Conectada", valor: -despMLC, nivel: 3 },
    { codigo: "4.2.7", nome: "Materiais Diversos", valor: -despMateriais, nivel: 2 },
    { codigo: "4.2.8", nome: "Outras Despesas Recorrentes", valor: -despOutrasRecorrentes, nivel: 2 },
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "(−) DESPESAS FINANCEIRAS", valor: -despesasFinanceiras, nivel: 0, negrito: true },
    { codigo: "4.3.1", nome: "Taxa de Antecipação de Recebíveis", valor: -despAntecipacao, nivel: 2 },
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "= LUCRO OPERACIONAL (EBIT)", valor: lucroOperacional, nivel: 0, negrito: true },
    { codigo: "", nome: "", valor: 0, nivel: -1 }, // separador
    { codigo: "", nome: "(−) DESPESAS NÃO RECORRENTES (ONE-OFFS)", valor: -despesasNaoRecorrentes, nivel: 0, negrito: true },
    { codigo: "4.4.1", nome: "Itens Não Recorrentes", valor: -despNaoRecorrentes, nivel: 2 },
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

export async function gerarBalanco(mes: number, ano: number): Promise<BalancoResult> {
  const dataFim = new Date(ano, mes, 0, 23, 59, 59);

  const saldos = await calcularSaldosAcumulados(dataFim);

  // Buscar saldos iniciais das contas bancárias
  const contasBancarias = await prisma.contaBancaria.findMany({
    select: {
      saldoInicial: true,
      contaContabil: { select: { codigo: true } },
    },
  });

  // Montar linhas do ATIVO
  const ativoLinhas: LinhaBalanco[] = [];

  // Ativo Circulante
  // Caixa e Equivalentes (contas 1.1.1.xx + saldo inicial)
  const caixaContas = filtrarPorPrefixo(saldos, "1.1.1");
  let totalCaixa = 0;
  for (const c of caixaContas) {
    const saldoInicialConta = contasBancarias.find(
      (cb: { saldoInicial: unknown; contaContabil: { codigo: string } }) => cb.contaContabil.codigo === c.codigo
    );
    const saldoInicial = saldoInicialConta ? Number(saldoInicialConta.saldoInicial) : 0;
    totalCaixa += c.saldo + saldoInicial;
  }

  const contasReceber = somarPorPrefixo(saldos, "1.1.2");
  const estoques = somarPorPrefixo(saldos, "1.1.3");
  const ativoCirculante = round2(totalCaixa + contasReceber + estoques);

  // Ativo Não Circulante
  const imobilizado = somarPorPrefixo(saldos, "1.2");
  const ativoNaoCirculante = round2(imobilizado);

  const totalAtivo = round2(ativoCirculante + ativoNaoCirculante);

  ativoLinhas.push(
    { codigo: "1", nome: "ATIVO", valor: totalAtivo, nivel: 0, negrito: true },
    { codigo: "1.1", nome: "Ativo Circulante", valor: ativoCirculante, nivel: 1, negrito: true },
    { codigo: "1.1.1", nome: "Caixa e Equivalentes de Caixa", valor: totalCaixa, nivel: 2 },
  );

  // Detalhar contas de caixa
  for (const c of caixaContas) {
    const saldoInicialConta = contasBancarias.find(
      (cb: { saldoInicial: unknown; contaContabil: { codigo: string } }) => cb.contaContabil.codigo === c.codigo
    );
    const saldoInicial = saldoInicialConta ? Number(saldoInicialConta.saldoInicial) : 0;
    ativoLinhas.push({
      codigo: c.codigo,
      nome: c.nome,
      valor: round2(c.saldo + saldoInicial),
      nivel: 3,
    });
  }

  ativoLinhas.push(
    { codigo: "1.1.2", nome: "Contas a Receber", valor: contasReceber, nivel: 2 },
  );
  for (const c of filtrarPorPrefixo(saldos, "1.1.2")) {
    ativoLinhas.push({ codigo: c.codigo, nome: c.nome, valor: round2(c.saldo), nivel: 3 });
  }

  ativoLinhas.push(
    { codigo: "1.1.3", nome: "Estoques", valor: estoques, nivel: 2 },
  );
  for (const c of filtrarPorPrefixo(saldos, "1.1.3")) {
    ativoLinhas.push({ codigo: c.codigo, nome: c.nome, valor: round2(c.saldo), nivel: 3 });
  }

  if (ativoNaoCirculante > 0) {
    ativoLinhas.push(
      { codigo: "1.2", nome: "Ativo Não Circulante", valor: ativoNaoCirculante, nivel: 1, negrito: true },
      { codigo: "1.2.1", nome: "Imobilizado", valor: imobilizado, nivel: 2 },
    );
  }

  // Montar linhas do PASSIVO + PL
  const passivoLinhas: LinhaBalanco[] = [];

  // Passivo Circulante
  const repasseConsignacao = somarPorPrefixo(saldos, "2.1.1");
  const obrigacoesFiscais = somarPorPrefixo(saldos, "2.1.2");
  const outrasObrigacoes = somarPorPrefixo(saldos, "2.1.3");
  const passivoCirculante = round2(repasseConsignacao + obrigacoesFiscais + outrasObrigacoes);

  // Passivo Não Circulante
  const passivoNaoCirculante = round2(somarPorPrefixo(saldos, "2.2"));

  // Patrimônio Líquido
  const capitalSocial = somarPorPrefixo(saldos, "2.3.1");
  const lucrosAcumulados = somarPorPrefixo(saldos, "2.3.2");
  const distribuicaoLucros = somarPorPrefixo(saldos, "2.3.3");

  // Lucros acumulados também precisa incluir o resultado do período
  // Resultado = Receitas (3.x) - Custos/Despesas (4.x)
  const totalReceitas = somarPorPrefixo(saldos, "3");
  const totalCustosDespesas = somarPorPrefixo(saldos, "4");
  const resultadoPeriodo = round2(totalReceitas - totalCustosDespesas);

  const pl = round2(capitalSocial + lucrosAcumulados + resultadoPeriodo - distribuicaoLucros);

  const totalPassivo = round2(passivoCirculante + passivoNaoCirculante + pl);

  passivoLinhas.push(
    { codigo: "2", nome: "PASSIVO + PATRIMÔNIO LÍQUIDO", valor: totalPassivo, nivel: 0, negrito: true },
    { codigo: "2.1", nome: "Passivo Circulante", valor: passivoCirculante, nivel: 1, negrito: true },
  );

  if (repasseConsignacao !== 0) {
    passivoLinhas.push({ codigo: "2.1.1", nome: "Fornecedores", valor: repasseConsignacao, nivel: 2 });
    for (const c of filtrarPorPrefixo(saldos, "2.1.1")) {
      passivoLinhas.push({ codigo: c.codigo, nome: c.nome, valor: round2(c.saldo), nivel: 3 });
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

  // Buscar saldos iniciais das contas bancárias
  const contasBancarias = await prisma.contaBancaria.findMany({
    select: {
      saldoInicial: true,
      contaContabil: { select: { codigo: true } },
    },
  });

  // Lucro líquido do período
  const totalReceitas = somarPorPrefixo(saldosPeriodo, "3");
  const totalCustosDespesas = somarPorPrefixo(saldosPeriodo, "4");
  const lucroLiquido = round2(totalReceitas - totalCustosDespesas);

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

  // Saldo de caixa
  const saldoInicialBancos = contasBancarias.reduce(
    (acc: number, cb: { saldoInicial: unknown }) => acc + Number(cb.saldoInicial),
    0
  );
  const caixaAnterior = somarPorPrefixo(saldosAnterior, "1.1.1");
  const saldoInicial = round2(caixaAnterior + saldoInicialBancos);
  const saldoFinal = round2(saldoInicial + variacaoLiquida);

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
