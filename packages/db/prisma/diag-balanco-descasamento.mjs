import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../../apps/web/.env");
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found! Tried:", envPath);
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const MES = 2;
const ANO = 2026;
const dataFim = `${ANO}-${String(MES).padStart(2, "0")}-${new Date(ANO, MES, 0).getDate()}`;

console.log(`\n========================================`);
console.log(`  DIAGNÓSTICO BALANÇO PATRIMONIAL`);
console.log(`  Período: até ${dataFim}`);
console.log(`========================================\n`);

// =============================================
// 1. SALDOS CONTÁBEIS (partidas dobradas)
// =============================================
console.log("=== 1. SALDOS CONTÁBEIS POR GRUPO ===\n");

const { rows: saldos } = await client.query(`
  WITH movimentos AS (
    SELECT
      cc.id, cc.codigo, cc.nome, cc.natureza,
      COALESCE(SUM(CASE WHEN ll."contaDebitoId" = cc.id THEN ll.valor ELSE 0 END), 0) as total_debitos,
      COALESCE(SUM(CASE WHEN ll."contaCreditoId" = cc.id THEN ll.valor ELSE 0 END), 0) as total_creditos
    FROM contas_contabeis cc
    LEFT JOIN linhas_lancamento ll ON (ll."contaDebitoId" = cc.id OR ll."contaCreditoId" = cc.id)
    LEFT JOIN lancamentos l ON l.id = ll."lancamentoId"
      AND l.data <= '${dataFim}'::date
      AND l.estornado = false
      AND l."estornoDeId" IS NULL
    GROUP BY cc.id, cc.codigo, cc.nome, cc.natureza
    HAVING COALESCE(SUM(CASE WHEN ll."contaDebitoId" = cc.id THEN ll.valor ELSE 0 END), 0) != 0
        OR COALESCE(SUM(CASE WHEN ll."contaCreditoId" = cc.id THEN ll.valor ELSE 0 END), 0) != 0
  )
  SELECT
    codigo, nome, natureza,
    total_debitos::numeric as debitos,
    total_creditos::numeric as creditos,
    CASE WHEN natureza = 'DEVEDORA'
      THEN (total_debitos - total_creditos)::numeric
      ELSE (total_creditos - total_debitos)::numeric
    END as saldo
  FROM movimentos
  ORDER BY codigo
`);

let totalDevedoras = 0;
let totalCredoras = 0;

for (const s of saldos) {
  const saldo = Number(s.saldo);
  if (Math.abs(saldo) < 0.01) continue;

  const grupo = s.codigo.charAt(0);
  if (grupo === '1' || grupo === '4') totalDevedoras += saldo; // Ativo + Despesas
  if (grupo === '2' || grupo === '3') totalCredoras += saldo;  // Passivo + Receitas

  console.log(`  ${s.codigo.padEnd(12)} ${s.nome.padEnd(45)} ${s.natureza.padEnd(10)} D:${Number(s.debitos).toFixed(2).padStart(12)} C:${Number(s.creditos).toFixed(2).padStart(12)} Saldo:${saldo.toFixed(2).padStart(12)}`);
}

console.log(`\n  Total contas DEVEDORAS (1.x + 4.x): ${totalDevedoras.toFixed(2)}`);
console.log(`  Total contas CREDORAS  (2.x + 3.x): ${totalCredoras.toFixed(2)}`);
console.log(`  DIFERENÇA (deve ser ZERO):           ${(totalDevedoras - totalCredoras).toFixed(2)}`);

// =============================================
// 2. VERIFICAÇÃO PARTIDAS DOBRADAS
// =============================================
console.log("\n\n=== 2. VERIFICAÇÃO PARTIDAS DOBRADAS ===\n");

const { rows: [totPartidas] } = await client.query(`
  SELECT
    SUM(ll.valor) as total_valor,
    COUNT(*) as qtd_linhas
  FROM linhas_lancamento ll
  JOIN lancamentos l ON l.id = ll."lancamentoId"
  WHERE l.data <= '${dataFim}'::date
    AND l.estornado = false
    AND l."estornoDeId" IS NULL
`);

console.log(`  Total linhas de lançamento: ${totPartidas.qtd_linhas}`);
console.log(`  Soma de todos os valores: ${Number(totPartidas.total_valor).toFixed(2)}`);
console.log(`  (cada linha debita E credita, então os saldos contábeis DEVEM bater)\n`);

// =============================================
// 3. CAIXA CONTÁBIL vs SALDO INICIAL
// =============================================
console.log("=== 3. CAIXA: CONTÁBIL + SALDO INICIAL ===\n");

const { rows: contasBancarias } = await client.query(`
  SELECT cb.nome, cb."saldoInicial", cc.codigo, cc.nome as conta_nome
  FROM contas_bancarias cb
  JOIN contas_contabeis cc ON cc.id = cb."contaContabilId"
  ORDER BY cc.codigo
`);

let totalSaldoInicial = 0;
let totalCaixaContabil = 0;

for (const cb of contasBancarias) {
  const si = Number(cb.saldoInicial);
  totalSaldoInicial += si;
  const contaSaldo = saldos.find(s => s.codigo === cb.codigo);
  const saldoContabil = contaSaldo ? Number(contaSaldo.saldo) : 0;
  totalCaixaContabil += saldoContabil;
  console.log(`  ${cb.codigo} ${cb.conta_nome.padEnd(30)} Saldo Inicial: ${si.toFixed(2).padStart(12)} Movimento Contábil: ${saldoContabil.toFixed(2).padStart(12)} Total: ${(si + saldoContabil).toFixed(2).padStart(12)}`);
}

console.log(`\n  TOTAL Saldo Inicial:    ${totalSaldoInicial.toFixed(2)}`);
console.log(`  TOTAL Movimento Contáb: ${totalCaixaContabil.toFixed(2)}`);
console.log(`  TOTAL Caixa (SI+Mov):   ${(totalSaldoInicial + totalCaixaContabil).toFixed(2)}`);

// =============================================
// 4. DADOS OPERACIONAIS (Contas a Receber + Estoque + Fornecedores)
// =============================================
console.log("\n\n=== 4. DADOS OPERACIONAIS (fora do plano de contas) ===\n");

// Contas a Receber
const { rows: [receb] } = await client.query(`
  SELECT
    COALESCE(SUM(v."valorFinal" - COALESCE(pg_total.total_pago, 0)), 0) as contas_receber
  FROM vendas v
  LEFT JOIN LATERAL (
    SELECT SUM(pg.valor) as total_pago FROM pagamentos pg WHERE pg."vendaId" = v.id
  ) pg_total ON true
  WHERE v.cancelada = false AND v."statusPagamento" IN ('NAO_PAGO', 'PARCIAL')
`);
const contasReceber = Number(receb.contas_receber);
console.log(`  Contas a Receber:       ${contasReceber.toFixed(2)}`);

// Estoque
const { rows: [est] } = await client.query(`
  SELECT
    COALESCE(SUM("valorCompra" + COALESCE("custoManutencao", 0)), 0) as estoque
  FROM pecas
  WHERE arquivado = false
    AND status IN ('DISPONIVEL', 'EM_TRANSITO', 'REVISAO')
    AND "origemTipo" = 'COMPRA'
`);
const estoques = Number(est.estoque);
console.log(`  Estoque (a custo):      ${estoques.toFixed(2)}`);

// Fornecedores - Repasse
const { rows: [rep] } = await client.query(`
  SELECT
    COALESCE(SUM("valorRepasseDevido" - COALESCE("valorRepasseFeito", 0)), 0) as repasse_pendente
  FROM vendas
  WHERE cancelada = false AND "statusRepasse" IN ('PENDENTE', 'PARCIAL')
`);
const repassePend = Number(rep.repasse_pendente);

// Fornecedores - Compras não pagas
const { rows: [comp] } = await client.query(`
  SELECT
    COALESCE(SUM("valorCompra" - COALESCE("valorPagoFornecedor", 0)), 0) as compras_a_pagar
  FROM pecas
  WHERE "origemTipo" = 'COMPRA'
    AND "statusPagamentoFornecedor" IN ('NAO_PAGO', 'PARCIAL')
    AND arquivado = false
`);
const comprasPagar = Number(comp.compras_a_pagar);
const totalFornecedores = repassePend + comprasPagar;

console.log(`  Fornecedores (Repasse): ${repassePend.toFixed(2)}`);
console.log(`  Fornecedores (Compras): ${comprasPagar.toFixed(2)}`);
console.log(`  Total Fornecedores:     ${totalFornecedores.toFixed(2)}`);

// =============================================
// 5. MONTAGEM DO BALANÇO
// =============================================
console.log("\n\n=== 5. MONTAGEM DO BALANÇO ===\n");

const totalCaixa = totalSaldoInicial + totalCaixaContabil;
const imobilizado = saldos.filter(s => s.codigo.startsWith("1.2")).reduce((a, s) => a + Number(s.saldo), 0);
const ativoCirculante = totalCaixa + contasReceber + estoques;
const ativoNaoCirculante = imobilizado;
const TOTAL_ATIVO = ativoCirculante + ativoNaoCirculante;

console.log(`  ATIVO:`);
console.log(`    Caixa e Equiv.:       ${totalCaixa.toFixed(2)}`);
console.log(`    Contas a Receber:     ${contasReceber.toFixed(2)}`);
console.log(`    Estoques:             ${estoques.toFixed(2)}`);
console.log(`    Ativo Circulante:     ${ativoCirculante.toFixed(2)}`);
console.log(`    Imobilizado:          ${imobilizado.toFixed(2)}`);
console.log(`    TOTAL ATIVO:          ${TOTAL_ATIVO.toFixed(2)}`);

// Passivo
const obrigacoesFiscais = saldos.filter(s => s.codigo.startsWith("2.1.2")).reduce((a, s) => a + Number(s.saldo), 0);
const outrasObrigacoes = saldos.filter(s => s.codigo.startsWith("2.1.3")).reduce((a, s) => a + Number(s.saldo), 0);
const passivoCirculante = totalFornecedores + obrigacoesFiscais + outrasObrigacoes;
const passivoNaoCirculante = saldos.filter(s => s.codigo.startsWith("2.2")).reduce((a, s) => a + Number(s.saldo), 0);

// PL
const capitalSocialHardcoded = 70273.40;
const capitalSocialContabil = saldos.filter(s => s.codigo.startsWith("2.3.1")).reduce((a, s) => a + Number(s.saldo), 0);
const lucrosAcumulados = saldos.filter(s => s.codigo.startsWith("2.3.2")).reduce((a, s) => a + Number(s.saldo), 0);
const distribuicaoLucros = saldos.filter(s => s.codigo.startsWith("2.3.3")).reduce((a, s) => a + Number(s.saldo), 0);

// Resultado do período (mesma fórmula do código)
const receitaBruta = saldos.filter(s => s.codigo.startsWith("3.1")).reduce((a, s) => a + Number(s.saldo), 0);
const deducoesReceita = saldos.filter(s => s.codigo.startsWith("3.2")).reduce((a, s) => a + Number(s.saldo), 0);
const totalCustosDespesas = saldos.filter(s => s.codigo.startsWith("4")).reduce((a, s) => a + Number(s.saldo), 0);
const resultadoPeriodo = receitaBruta - deducoesReceita - totalCustosDespesas;

const plComCapitalHardcoded = capitalSocialHardcoded + lucrosAcumulados + resultadoPeriodo - distribuicaoLucros;
const plComCapitalContabil = capitalSocialContabil + lucrosAcumulados + resultadoPeriodo - distribuicaoLucros;

const TOTAL_PASSIVO_HARDCODED = passivoCirculante + passivoNaoCirculante + plComCapitalHardcoded;
const TOTAL_PASSIVO_CONTABIL = passivoCirculante + passivoNaoCirculante + plComCapitalContabil;

console.log(`\n  PASSIVO:`);
console.log(`    Fornecedores:         ${totalFornecedores.toFixed(2)}`);
console.log(`    Obrigações Fiscais:   ${obrigacoesFiscais.toFixed(2)}`);
console.log(`    Outras Obrigações:    ${outrasObrigacoes.toFixed(2)}`);
console.log(`    Passivo Circulante:   ${passivoCirculante.toFixed(2)}`);
console.log(`    Passivo Não Circ.:    ${passivoNaoCirculante.toFixed(2)}`);

console.log(`\n  PATRIMÔNIO LÍQUIDO:`);
console.log(`    Capital Social (hardcoded=70273.40): ${capitalSocialHardcoded.toFixed(2)}`);
console.log(`    Capital Social (contábil 2.3.1):     ${capitalSocialContabil.toFixed(2)}`);
console.log(`    Lucros Acumulados (2.3.2):           ${lucrosAcumulados.toFixed(2)}`);
console.log(`    Distribuição Lucros (2.3.3):         ${distribuicaoLucros.toFixed(2)}`);

console.log(`\n  RESULTADO (Receitas - Deduções - Custos):`);
console.log(`    Receita Bruta (3.1):     ${receitaBruta.toFixed(2)}`);
console.log(`    Deduções (3.2):          ${deducoesReceita.toFixed(2)}`);
console.log(`    Custos/Despesas (4):     ${totalCustosDespesas.toFixed(2)}`);
console.log(`    Resultado:               ${resultadoPeriodo.toFixed(2)}`);

console.log(`\n  PL (c/ capital hardcoded): ${plComCapitalHardcoded.toFixed(2)}`);
console.log(`  PL (c/ capital contábil):   ${plComCapitalContabil.toFixed(2)}`);

console.log(`\n  ============================================`);
console.log(`  TOTAL ATIVO:                   ${TOTAL_ATIVO.toFixed(2)}`);
console.log(`  TOTAL PASSIVO (hardcoded):     ${TOTAL_PASSIVO_HARDCODED.toFixed(2)}`);
console.log(`  TOTAL PASSIVO (contábil):      ${TOTAL_PASSIVO_CONTABIL.toFixed(2)}`);
console.log(`  DESCASAMENTO (hardcoded):      ${(TOTAL_ATIVO - TOTAL_PASSIVO_HARDCODED).toFixed(2)}`);
console.log(`  DESCASAMENTO (contábil):       ${(TOTAL_ATIVO - TOTAL_PASSIVO_CONTABIL).toFixed(2)}`);
console.log(`  ============================================`);

// =============================================
// 6. ANÁLISE DA CAUSA
// =============================================
console.log("\n\n=== 6. ANÁLISE DA CAUSA ===\n");

// A equação contábil pura (sem dados operacionais) seria:
// Ativo (1.x) = Passivo (2.x) + Receitas (3.x) - Despesas (4.x) [no período]
// Como usamos partidas dobradas, Σdébitos = Σcréditos, logo:
// Saldo DEVEDORA (1+4) = Saldo CREDORA (2+3)

const ativo1x = saldos.filter(s => s.codigo.startsWith("1")).reduce((a, s) => a + Number(s.saldo), 0);
const passivoPL2x = saldos.filter(s => s.codigo.startsWith("2")).reduce((a, s) => a + Number(s.saldo), 0);
const receitas3x = saldos.filter(s => s.codigo.startsWith("3")).reduce((a, s) => a + Number(s.saldo), 0);
const despesas4x = saldos.filter(s => s.codigo.startsWith("4")).reduce((a, s) => a + Number(s.saldo), 0);

console.log(`  CONTÁBIL PURO (só lançamentos, sem saldoInicial, sem operacional):`);
console.log(`    Ativo (1.x):           ${ativo1x.toFixed(2)}`);
console.log(`    Passivo+PL (2.x):      ${passivoPL2x.toFixed(2)}`);
console.log(`    Receitas (3.x):        ${receitas3x.toFixed(2)}`);
console.log(`    Despesas (4.x):        ${despesas4x.toFixed(2)}`);
console.log(`    Resultado (3-4):       ${(receitas3x - despesas4x).toFixed(2)}`);
console.log(`    1+4 vs 2+3:            ${(ativo1x + despesas4x).toFixed(2)} vs ${(passivoPL2x + receitas3x).toFixed(2)}`);
console.log(`    Diferença (deve=0):    ${((ativo1x + despesas4x) - (passivoPL2x + receitas3x)).toFixed(2)}`);

console.log(`\n  BALANÇO MISTO (contábil + operacional):`);
console.log(`    Ativo Balanço:         ${TOTAL_ATIVO.toFixed(2)}`);
console.log(`    = Caixa(contáb+SI)     ${totalCaixa.toFixed(2)}`);
console.log(`    + ContasReceber(oper)  ${contasReceber.toFixed(2)}`);
console.log(`    + Estoque(oper)        ${estoques.toFixed(2)}`);
console.log(`    + Imobilizado(contáb)  ${imobilizado.toFixed(2)}`);

console.log(`\n  DIFERENÇA entre Caixa contábil (1.1.1) e Caixa usada no Balanço:`);
const caixaContabilPura = saldos.filter(s => s.codigo.startsWith("1.1.1")).reduce((a, s) => a + Number(s.saldo), 0);
console.log(`    Caixa contábil (1.1.1) pura:  ${caixaContabilPura.toFixed(2)}`);
console.log(`    + Saldo Inicial bancos:        ${totalSaldoInicial.toFixed(2)}`);
console.log(`    = Caixa no Balanço:            ${totalCaixa.toFixed(2)}`);

console.log(`\n  DIFERENÇA entre ContasReceber contábil (1.1.2) e operacional:`);
const contasReceberContabil = saldos.filter(s => s.codigo.startsWith("1.1.2")).reduce((a, s) => a + Number(s.saldo), 0);
console.log(`    Contas a Receber (contábil 1.1.2): ${contasReceberContabil.toFixed(2)}`);
console.log(`    Contas a Receber (operacional):    ${contasReceber.toFixed(2)}`);
console.log(`    DIVERGÊNCIA:                       ${(contasReceber - contasReceberContabil).toFixed(2)}`);

console.log(`\n  DIFERENÇA entre Estoque contábil (1.1.3) e operacional:`);
const estoqueContabil = saldos.filter(s => s.codigo.startsWith("1.1.3")).reduce((a, s) => a + Number(s.saldo), 0);
console.log(`    Estoque (contábil 1.1.3):    ${estoqueContabil.toFixed(2)}`);
console.log(`    Estoque (operacional):        ${estoques.toFixed(2)}`);
console.log(`    DIVERGÊNCIA:                  ${(estoques - estoqueContabil).toFixed(2)}`);

console.log(`\n  DIFERENÇA entre Fornecedores contábil (2.1.1) e operacional:`);
const fornecedoresContabil = saldos.filter(s => s.codigo.startsWith("2.1.1")).reduce((a, s) => a + Number(s.saldo), 0);
console.log(`    Fornecedores (contábil 2.1.1):  ${fornecedoresContabil.toFixed(2)}`);
console.log(`    Fornecedores (operacional):      ${totalFornecedores.toFixed(2)}`);
console.log(`    DIVERGÊNCIA:                     ${(totalFornecedores - fornecedoresContabil).toFixed(2)}`);

// =============================================
// 7. BALANÇO PURAMENTE CONTÁBIL (sem dados operacionais)
// =============================================
console.log("\n\n=== 7. BALANÇO PURAMENTE CONTÁBIL ===\n");

const ativoPuro = caixaContabilPura + totalSaldoInicial + contasReceberContabil + estoqueContabil + imobilizado;
const passivoPuro = fornecedoresContabil + obrigacoesFiscais + outrasObrigacoes + passivoNaoCirculante;
const plPuro = capitalSocialContabil + lucrosAcumulados + resultadoPeriodo - distribuicaoLucros;
const totalPassivoPuro = passivoPuro + plPuro;

console.log(`  Ativo Puro:    ${ativoPuro.toFixed(2)}`);
console.log(`  Passivo Puro:  ${totalPassivoPuro.toFixed(2)}`);
console.log(`  Descasamento:  ${(ativoPuro - totalPassivoPuro).toFixed(2)}`);

// 8. Verificar duplicatas de lançamentos por venda
console.log("\n\n=== 8. VENDAS COM LANÇAMENTOS DUPLICADOS ===\n");
const { rows: dupVendas } = await client.query(`
  SELECT v.id, p.sku, COUNT(DISTINCT l.id) as qtd_lancamentos,
         SUM(ll.valor) as soma_valores
  FROM vendas v
  JOIN pecas p ON p.id = v."pecaId"
  JOIN lancamentos l ON l."vendaId" = v.id AND l.estornado = false AND l."estornoDeId" IS NULL
  JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  GROUP BY v.id, p.sku
  HAVING COUNT(DISTINCT l.id) > 4
  ORDER BY COUNT(DISTINCT l.id) DESC
`);
if (dupVendas.length === 0) {
  console.log("  Nenhuma venda com mais de 4 lançamentos (OK)");
} else {
  for (const d of dupVendas) {
    console.log(`  ⚠️  ${d.sku}: ${d.qtd_lancamentos} lançamentos, soma R$${Number(d.soma_valores).toFixed(2)}`);
  }
}

// 9. Capital Social - verificar lançamentos na conta 2.3.1
console.log("\n\n=== 9. LANÇAMENTOS NA CONTA CAPITAL SOCIAL (2.3.1) ===\n");
const { rows: lancCapital } = await client.query(`
  SELECT l.id, l.descricao, l.data, ll.valor,
         cd.codigo as deb, cc.codigo as cred
  FROM lancamentos l
  JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
  JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
  WHERE l.estornado = false AND l."estornoDeId" IS NULL
    AND (cd.codigo LIKE '2.3.1%' OR cc.codigo LIKE '2.3.1%')
  ORDER BY l.data
`);
if (lancCapital.length === 0) {
  console.log("  Nenhum lançamento em 2.3.1 (capital social não tem movimento contábil)");
  console.log(`  → Código usa hardcoded R$70.273,40 mas contábil mostra R$${capitalSocialContabil.toFixed(2)}`);
} else {
  for (const l of lancCapital) {
    console.log(`  ${l.data.toISOString().slice(0,10)} | D:${l.deb} C:${l.cred} R$${Number(l.valor).toFixed(2)} | ${l.descricao}`);
  }
}

await client.end();
console.log("\n✅ Diagnóstico completo.");
