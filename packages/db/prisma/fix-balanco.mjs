/**
 * fix-balanco.mjs
 * Corrige o Balanço Patrimonial de Fev/2026:
 *   1. Deleta despesas recorrentes duplicadas em Fev/2026
 *   2. Recalibra saldoInicial do Nubank
 *
 * Executar de: packages/db/prisma/
 *   node fix-balanco.mjs
 */
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: "../../../apps/web/.env" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const round2 = (n) => Math.round(n * 100) / 100;

// ─── Correção 1: Deletar despesas recorrentes duplicadas em Fev/2026 ───

const { rows: lancRecorrentes } = await client.query(`
  SELECT id, "despesaRecorrenteId", "createdAt"
  FROM lancamentos
  WHERE tipo = 'AUTOMATICO_DESPESA_RECORRENTE'
    AND data >= '2026-02-01' AND data < '2026-03-01'
    AND estornado = false
  ORDER BY "despesaRecorrenteId", "createdAt" ASC
`);

console.log(`Total lançamentos AUTOMATICO_DESPESA_RECORRENTE em Fev/2026: ${lancRecorrentes.length}`);

const grupos = {};
for (const l of lancRecorrentes) {
  const key = l.despesaRecorrenteId || "sem-id";
  if (!grupos[key]) grupos[key] = [];
  grupos[key].push(l);
}

const idsParaDeletar = [];
for (const [despRecId, lancamentos] of Object.entries(grupos)) {
  if (lancamentos.length > 1) {
    console.log(`  Despesa ${despRecId}: ${lancamentos.length} lançamentos (deletando ${lancamentos.length - 1} extras)`);
    for (let i = 1; i < lancamentos.length; i++) {
      idsParaDeletar.push(lancamentos[i].id);
    }
  }
}

if (idsParaDeletar.length > 0) {
  const linhasRes = await client.query(`DELETE FROM linhas_lancamento WHERE "lancamentoId" = ANY($1)`, [idsParaDeletar]);
  console.log(`  Linhas deletadas: ${linhasRes.rowCount}`);
  const lancRes = await client.query(`DELETE FROM lancamentos WHERE id = ANY($1)`, [idsParaDeletar]);
  console.log(`  Lançamentos duplicados deletados: ${lancRes.rowCount}`);
} else {
  console.log("  Nenhuma duplicata encontrada.");
}

// ─── Correção 2: Recalibrar saldoInicial do Nubank ───

// Saldos contábeis (partidas dobradas, mesma lógica do serviço)
const { rows: linhasRaw } = await client.query(`
  SELECT
    ll."contaDebitoId",
    ll."contaCreditoId",
    ll.valor,
    cd.codigo as deb_codigo, cd.nome as deb_nome, cd.natureza as deb_natureza,
    cc.codigo as cred_codigo, cc.nome as cred_nome, cc.natureza as cred_natureza
  FROM linhas_lancamento ll
  JOIN lancamentos l ON ll."lancamentoId" = l.id
  JOIN contas_contabeis cd ON ll."contaDebitoId" = cd.id
  JOIN contas_contabeis cc ON ll."contaCreditoId" = cc.id
  WHERE l.estornado = false
    AND l."estornoDeId" IS NULL
    AND l.data <= '2026-02-28'
`);

const debitos = {};
const creditos = {};
const contasInfo = {};

for (const l of linhasRaw) {
  const valor = Number(l.valor);
  const dId = l.contaDebitoId;
  debitos[dId] = (debitos[dId] || 0) + valor;
  if (!contasInfo[dId]) contasInfo[dId] = { codigo: l.deb_codigo, nome: l.deb_nome, natureza: l.deb_natureza };
  const cId = l.contaCreditoId;
  creditos[cId] = (creditos[cId] || 0) + valor;
  if (!contasInfo[cId]) contasInfo[cId] = { codigo: l.cred_codigo, nome: l.cred_nome, natureza: l.cred_natureza };
}

const saldos = {};
const todasContas = new Set([...Object.keys(debitos), ...Object.keys(creditos)]);
for (const contaId of todasContas) {
  const info = contasInfo[contaId];
  const totalDebito = debitos[contaId] || 0;
  const totalCredito = creditos[contaId] || 0;
  const saldo = info.natureza === "DEVEDORA"
    ? totalDebito - totalCredito
    : totalCredito - totalDebito;
  if (Math.abs(saldo) > 0.001) {
    saldos[info.codigo] = saldo;
  }
}

function somarPorPrefixo(saldos, prefixo) {
  let total = 0;
  for (const [codigo, valor] of Object.entries(saldos)) {
    if (codigo.startsWith(prefixo)) total += valor;
  }
  return round2(total);
}

// === ATIVO ===

// Caixa contábil (1.1.1) — sem saldoInicial
const caixaContabil = somarPorPrefixo(saldos, "1.1.1");
const ativoNaoCirculante = somarPorPrefixo(saldos, "1.2");

// Contas a Receber — vendas não pagas/parciais (soma pagamentos)
const { rows: vendasRecebiveis } = await client.query(`
  SELECT v."valorFinal", COALESCE(pg_sum.total, 0) as total_pago
  FROM vendas v
  LEFT JOIN (
    SELECT "vendaId", SUM(valor) as total
    FROM pagamentos
    GROUP BY "vendaId"
  ) pg_sum ON pg_sum."vendaId" = v.id
  WHERE v.cancelada = false
    AND v."statusPagamento" IN ('NAO_PAGO', 'PARCIAL')
`);
const contasReceber = round2(vendasRecebiveis.reduce((acc, v) => acc + Number(v.valorFinal) - Number(v.total_pago), 0));

// Estoque — peças COMPRA em status contabilizável
const { rows: estoqueRows } = await client.query(`
  SELECT COALESCE(SUM("valorCompra" + COALESCE("custoManutencao", 0)), 0) as total
  FROM pecas
  WHERE arquivado = false
    AND status IN ('DISPONIVEL', 'EM_TRANSITO', 'REVISAO')
    AND "origemTipo" = 'COMPRA'
`);
const estoques = round2(Number(estoqueRows[0].total));

// === PASSIVO ===

// Repasses consignação pendentes
const { rows: repasseRows } = await client.query(`
  SELECT COALESCE(SUM("valorRepasseDevido"), 0) as total_devido,
         COALESCE(SUM("valorRepasseFeito"), 0) as total_feito
  FROM vendas
  WHERE cancelada = false
    AND "statusRepasse" IN ('PENDENTE', 'PARCIAL')
`);
const repasseConsignacao = round2(Number(repasseRows[0].total_devido) - Number(repasseRows[0].total_feito));

// Compras a pagar
const { rows: comprasRows } = await client.query(`
  SELECT COALESCE(SUM("valorCompra"), 0) as total_compra,
         COALESCE(SUM("valorPagoFornecedor"), 0) as total_pago
  FROM pecas
  WHERE "origemTipo" = 'COMPRA'
    AND "statusPagamentoFornecedor" IN ('NAO_PAGO', 'PARCIAL')
    AND arquivado = false
`);
const fornecedoresCompras = round2(Number(comprasRows[0].total_compra) - Number(comprasRows[0].total_pago));
const totalFornecedores = round2(repasseConsignacao + fornecedoresCompras);

const obrigacoesFiscais = somarPorPrefixo(saldos, "2.1.2");
const outrasObrigacoes = somarPorPrefixo(saldos, "2.1.3");
const passivoCirculante = round2(totalFornecedores + obrigacoesFiscais + outrasObrigacoes);
const passivoNaoCirculante = round2(somarPorPrefixo(saldos, "2.2"));

// === PL ===

const capitalSocial = 70273.40;
const lucrosAcumulados = somarPorPrefixo(saldos, "2.3.2");
const distribuicaoLucros = somarPorPrefixo(saldos, "2.3.3");

// Resultado (corrigido)
const receitaBruta = somarPorPrefixo(saldos, "3.1");
const deducoesReceita = somarPorPrefixo(saldos, "3.2");
const totalCustosDespesas = somarPorPrefixo(saldos, "4");
const resultadoPeriodo = round2(receitaBruta - deducoesReceita - totalCustosDespesas);

const pl = round2(capitalSocial + lucrosAcumulados + resultadoPeriodo - distribuicaoLucros);
const totalPassivoPL = round2(passivoCirculante + passivoNaoCirculante + pl);

// Ativo sem saldoInicial
const ativoCirculanteSemSaldo = round2(caixaContabil + contasReceber + estoques);
const ativoSemSaldo = round2(ativoCirculanteSemSaldo + ativoNaoCirculante);

// saldoInicial = totalPassivoPL - ativoSemSaldo
const novoSaldoInicial = round2(totalPassivoPL - ativoSemSaldo);

// Buscar Nubank
const { rows: nubankRows } = await client.query(`
  SELECT id, nome, banco, "saldoInicial" FROM contas_bancarias WHERE banco ILIKE '%nubank%' LIMIT 1
`);

if (nubankRows.length === 0) {
  console.log("Conta Nubank não encontrada!");
  await client.end();
  process.exit(1);
}

const nubank = nubankRows[0];

console.log("\n─── Diagnóstico do Balanço ───");
console.log(`Caixa contábil (1.1.1): ${caixaContabil}`);
console.log(`Contas a Receber: ${contasReceber}`);
console.log(`Estoque: ${estoques}`);
console.log(`Ativo Não Circulante (1.2): ${ativoNaoCirculante}`);
console.log(`Ativo SEM saldoInicial: ${ativoSemSaldo}`);
console.log(`---`);
console.log(`Passivo Circulante: ${passivoCirculante}`);
console.log(`  Fornecedores: ${totalFornecedores} (repasse: ${repasseConsignacao}, compras: ${fornecedoresCompras})`);
console.log(`  Obrigações Fiscais (2.1.2): ${obrigacoesFiscais}`);
console.log(`  Outras Obrigações (2.1.3): ${outrasObrigacoes}`);
console.log(`Passivo Não Circulante: ${passivoNaoCirculante}`);
console.log(`---`);
console.log(`Capital Social: ${capitalSocial}`);
console.log(`Lucros Acumulados (2.3.2): ${lucrosAcumulados}`);
console.log(`Distribuição Lucros (2.3.3): ${distribuicaoLucros}`);
console.log(`Resultado: ${resultadoPeriodo}`);
console.log(`  Receita Bruta (3.1): ${receitaBruta}`);
console.log(`  Deduções (3.2): ${deducoesReceita}`);
console.log(`  Custos/Despesas (4): ${totalCustosDespesas}`);
console.log(`PL: ${pl}`);
console.log(`Total Passivo+PL: ${totalPassivoPL}`);
console.log(`---`);
console.log(`Nubank: ${nubank.nome} (saldoInicial atual: ${nubank.saldoInicial})`);
console.log(`Novo saldoInicial necessário: ${novoSaldoInicial}`);

await client.query(`UPDATE contas_bancarias SET "saldoInicial" = $1 WHERE id = $2`, [novoSaldoInicial, nubank.id]);
console.log(`\nSaldoInicial atualizado para: ${novoSaldoInicial}`);

// Verificação
const ativoFinal = round2(novoSaldoInicial + ativoSemSaldo);
const diferenca = round2(ativoFinal - totalPassivoPL);
console.log(`\n─── Verificação Final ───`);
console.log(`Ativo Total: ${ativoFinal}`);
console.log(`Passivo+PL Total: ${totalPassivoPL}`);
console.log(`Diferença: ${diferenca}`);
console.log(`Equilibrado: ${Math.abs(diferenca) < 0.02 ? "SIM" : "NÃO"}`);

await client.end();
