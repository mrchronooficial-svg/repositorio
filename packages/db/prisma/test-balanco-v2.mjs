import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const dataFim = "2026-02-28";
const CAPITAL_SOCIAL = 70273.40;

console.log(`\n========================================`);
console.log(`  TESTE BALANÇO v2 (Capital Social como base)`);
console.log(`========================================\n`);

// =============================================
// CAIXA = Capital Social + entradas operacionais - saídas operacionais - saídas contábeis
// =============================================

// 1. Pagamentos de clientes (entrada de caixa)
const { rows: pagClientesPIX } = await client.query(`
  SELECT COALESCE(SUM(pg.valor), 0) as total
  FROM pagamentos pg
  JOIN vendas v ON v.id = pg."vendaId"
  WHERE v.cancelada = false AND v."formaPagamento" = 'PIX' AND pg.data <= '${dataFim}'::date
`);

const { rows: pagClientesCartao } = await client.query(`
  SELECT pg.valor, v."taxaMDR"
  FROM pagamentos pg
  JOIN vendas v ON v.id = pg."vendaId"
  WHERE v.cancelada = false AND v."formaPagamento" IN ('CREDITO_VISTA', 'CREDITO_PARCELADO') AND pg.data <= '${dataFim}'::date
`);

const cashInPIX = Number(pagClientesPIX[0].total);
let cashInCartao = 0;
for (const p of pagClientesCartao) {
  const mdr = Number(p.taxaMDR || 0) / 100;
  cashInCartao += Number(p.valor) * (1 - mdr);
}
const cashInClientes = cashInPIX + cashInCartao;

console.log(`  (+) Pagamentos PIX:     ${cashInPIX.toFixed(2)}`);
console.log(`  (+) Pagamentos Cartão (líq MDR): ${cashInCartao.toFixed(2)}`);
console.log(`  (+) TOTAL Clientes:     ${cashInClientes.toFixed(2)}`);

// 2. Pagamentos a fornecedores (saída de caixa)
const { rows: [pf] } = await client.query(`
  SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos_fornecedor WHERE data <= '${dataFim}'::date
`);
const cashOutFornecedores = Number(pf.total);
console.log(`  (-) Pagamentos Fornecedores: ${cashOutFornecedores.toFixed(2)}`);

// 3. Repasses consignação (saída de caixa)
const { rows: [rep] } = await client.query(`
  SELECT COALESCE(SUM("valorRepasseFeito"), 0) as total FROM vendas WHERE cancelada = false
`);
const cashOutRepasses = Number(rep.total);
console.log(`  (-) Repasses Consignação: ${cashOutRepasses.toFixed(2)}`);

// 4. Saídas contábeis não ligadas a vendas (despesas, distribuições, etc.)
//    Entries que CREDITAM 1.1.1 com vendaId IS NULL = dinheiro que saiu do caixa
const { rows: [nonSaleOut] } = await client.query(`
  SELECT COALESCE(SUM(ll.valor), 0) as total
  FROM linhas_lancamento ll
  JOIN lancamentos l ON l.id = ll."lancamentoId"
  JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
  WHERE cc.codigo LIKE '1.1.1%'
    AND l."vendaId" IS NULL
    AND l.estornado = false AND l."estornoDeId" IS NULL
    AND l.data <= '${dataFim}'::date
`);
const cashOutContabil = Number(nonSaleOut.total);
console.log(`  (-) Saídas contábeis (despesas/distrib): ${cashOutContabil.toFixed(2)}`);

// 5. Entradas contábeis não ligadas a vendas (antecipações foram via vendaId, então aqui seria transferências, etc.)
const { rows: [nonSaleIn] } = await client.query(`
  SELECT COALESCE(SUM(ll.valor), 0) as total
  FROM linhas_lancamento ll
  JOIN lancamentos l ON l.id = ll."lancamentoId"
  JOIN contas_contabeis cc ON cc.id = ll."contaDebitoId"
  WHERE cc.codigo LIKE '1.1.1%'
    AND l."vendaId" IS NULL
    AND l.estornado = false AND l."estornoDeId" IS NULL
    AND l.data <= '${dataFim}'::date
`);
const cashInContabil = Number(nonSaleIn.total);
console.log(`  (+) Entradas contábeis (não-venda): ${cashInContabil.toFixed(2)}`);

const netContabil = cashInContabil - cashOutContabil;
console.log(`  Net contábil não-venda: ${netContabil.toFixed(2)}`);

// CAIXA
const caixa = CAPITAL_SOCIAL + cashInClientes - cashOutFornecedores - cashOutRepasses + netContabil;
console.log(`\n  CAIXA = ${CAPITAL_SOCIAL.toFixed(2)} + ${cashInClientes.toFixed(2)} - ${cashOutFornecedores.toFixed(2)} - ${cashOutRepasses.toFixed(2)} + ${netContabil.toFixed(2)}`);
console.log(`  CAIXA = ${caixa.toFixed(2)}`);

// =============================================
// OUTROS ITENS (mesma lógica de antes)
// =============================================

// Contas a Receber
const { rows: vendasPend } = await client.query(`
  SELECT v."formaPagamento", v."valorFinal", v."taxaMDR",
         COALESCE(pg_total.total_pago, 0) as pago
  FROM vendas v
  LEFT JOIN LATERAL (
    SELECT SUM(pg.valor) as total_pago FROM pagamentos pg WHERE pg."vendaId" = v.id AND pg.data <= '${dataFim}'::date
  ) pg_total ON true
  WHERE v.cancelada = false AND v."statusPagamento" IN ('NAO_PAGO', 'PARCIAL') AND v."dataVenda" <= '${dataFim}'::date
`);
let contasReceber = 0;
for (const v of vendasPend) {
  const pendente = Number(v.valorFinal) - Number(v.pago);
  if (pendente <= 0) continue;
  if (v.formaPagamento === "PIX") {
    contasReceber += pendente;
  } else {
    contasReceber += pendente * (1 - Number(v.taxaMDR || 0) / 100);
  }
}

// Estoque
const { rows: [est] } = await client.query(`
  SELECT COALESCE(SUM("valorCompra" + COALESCE("custoManutencao", 0)), 0) as total
  FROM pecas WHERE arquivado = false AND status IN ('DISPONIVEL', 'EM_TRANSITO', 'REVISAO') AND "origemTipo" = 'COMPRA'
`);
const estoque = Number(est.total);

// Fornecedores
const { rows: [repPend] } = await client.query(`
  SELECT COALESCE(SUM("valorRepasseDevido" - COALESCE("valorRepasseFeito", 0)), 0) as total
  FROM vendas WHERE cancelada = false AND "statusRepasse" IN ('PENDENTE', 'PARCIAL')
`);
const { rows: [compPend] } = await client.query(`
  SELECT COALESCE(SUM("valorCompra" - COALESCE("valorPagoFornecedor", 0)), 0) as total
  FROM pecas WHERE "origemTipo" = 'COMPRA' AND "statusPagamentoFornecedor" IN ('NAO_PAGO', 'PARCIAL') AND arquivado = false
`);
const fornecedores = Number(repPend.total) + Number(compPend.total);

// Obrigações Fiscais
const { rows: [fisc] } = await client.query(`
  WITH movs AS (
    SELECT cc.id,
      COALESCE(SUM(CASE WHEN ll."contaCreditoId" = cc.id THEN ll.valor ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN ll."contaDebitoId" = cc.id THEN ll.valor ELSE 0 END), 0) as saldo
    FROM contas_contabeis cc
    LEFT JOIN linhas_lancamento ll ON (ll."contaDebitoId" = cc.id OR ll."contaCreditoId" = cc.id)
    LEFT JOIN lancamentos l ON l.id = ll."lancamentoId" AND l.data <= '${dataFim}'::date AND l.estornado = false AND l."estornoDeId" IS NULL
    WHERE cc.codigo LIKE '2.1.2%' GROUP BY cc.id
  ) SELECT COALESCE(SUM(saldo), 0) as total FROM movs
`);
const obrigFiscais = Number(fisc.total);

// DRE Resultado
const { rows: saldosDRE } = await client.query(`
  WITH movs AS (
    SELECT cc.codigo, cc.natureza,
      COALESCE(SUM(CASE WHEN ll."contaDebitoId" = cc.id THEN ll.valor ELSE 0 END), 0) as deb,
      COALESCE(SUM(CASE WHEN ll."contaCreditoId" = cc.id THEN ll.valor ELSE 0 END), 0) as cred
    FROM contas_contabeis cc
    LEFT JOIN linhas_lancamento ll ON (ll."contaDebitoId" = cc.id OR ll."contaCreditoId" = cc.id)
    LEFT JOIN lancamentos l ON l.id = ll."lancamentoId" AND l.data <= '${dataFim}'::date AND l.estornado = false AND l."estornoDeId" IS NULL
    WHERE cc.codigo LIKE '3%' OR cc.codigo LIKE '4%'
    GROUP BY cc.id, cc.codigo, cc.natureza
    HAVING COALESCE(SUM(CASE WHEN ll."contaDebitoId" = cc.id THEN ll.valor ELSE 0 END), 0) != 0
        OR COALESCE(SUM(CASE WHEN ll."contaCreditoId" = cc.id THEN ll.valor ELSE 0 END), 0) != 0
  ) SELECT codigo, CASE WHEN natureza = 'DEVEDORA' THEN deb - cred ELSE cred - deb END as saldo FROM movs
`);
let r31 = 0, r32 = 0, r4 = 0;
for (const s of saldosDRE) {
  const v = Number(s.saldo);
  if (s.codigo.startsWith("3.1")) r31 += v;
  else if (s.codigo.startsWith("3.2")) r32 += v;
  else if (s.codigo.startsWith("4")) r4 += v;
}
const resultado = r31 - r32 - r4;
const pl = CAPITAL_SOCIAL + resultado;

// BALANÇO
const totalAtivo = caixa + contasReceber + estoque;
const totalPassivo = fornecedores + obrigFiscais + pl;

console.log(`\n========================================`);
console.log(`  BALANÇO PATRIMONIAL v2`);
console.log(`========================================`);
console.log(`  ATIVO:`);
console.log(`    Caixa:            ${caixa.toFixed(2)}`);
console.log(`    Contas a Receber: ${contasReceber.toFixed(2)}`);
console.log(`    Estoque:          ${estoque.toFixed(2)}`);
console.log(`    TOTAL ATIVO:      ${totalAtivo.toFixed(2)}`);
console.log(`  PASSIVO + PL:`);
console.log(`    Fornecedores:     ${fornecedores.toFixed(2)}`);
console.log(`    Obrigações Fisc.: ${obrigFiscais.toFixed(2)}`);
console.log(`    Capital Social:   ${CAPITAL_SOCIAL.toFixed(2)}`);
console.log(`    Resultado:        ${resultado.toFixed(2)}`);
console.log(`    PL:               ${pl.toFixed(2)}`);
console.log(`    TOTAL PASSIVO:    ${totalPassivo.toFixed(2)}`);
console.log(`  ============================================`);
console.log(`  DESCASAMENTO:       ${(totalAtivo - totalPassivo).toFixed(2)}`);
console.log(`  EQUILIBRADO:        ${Math.abs(totalAtivo - totalPassivo) < 1 ? 'SIM ✅' : 'NÃO ❌'}`);
console.log(`  ============================================`);

// Detailed breakdown of what would make it balance
const resultadoImplicito = totalAtivo - fornecedores - obrigFiscais - CAPITAL_SOCIAL;
console.log(`\n  Se PL.Resultado fosse calculado como plug: ${resultadoImplicito.toFixed(2)}`);
console.log(`  DRE Resultado (contábil): ${resultado.toFixed(2)}`);
console.log(`  Diferença: ${(resultadoImplicito - resultado).toFixed(2)}`);

await client.end();
