import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found!");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const MES = 2;
const ANO = 2026;
const dataFim = `${ANO}-${String(MES).padStart(2, "0")}-${new Date(ANO, MES, 0).getDate()}`;

console.log(`\n========================================`);
console.log(`  TESTE BALANÇO NOVO`);
console.log(`  Período: até ${dataFim}`);
console.log(`========================================\n`);

// =============================================
// 1. CAIXA (nova fórmula)
// =============================================
console.log("=== 1. CAIXA (nova fórmula) ===\n");

// 1a. Saldo Inicial bancos
const { rows: bancos } = await client.query(`
  SELECT cb."saldoInicial", cc.codigo, cc.nome
  FROM contas_bancarias cb
  JOIN contas_contabeis cc ON cc.id = cb."contaContabilId"
`);
let saldoInicialBancos = 0;
for (const b of bancos) {
  saldoInicialBancos += Number(b.saldoInicial);
  console.log(`  Saldo Inicial ${b.codigo} (${b.nome}): ${Number(b.saldoInicial).toFixed(2)}`);
}
console.log(`  TOTAL Saldo Inicial: ${saldoInicialBancos.toFixed(2)}`);

// 1b. Movimentos contábeis em 1.1.1
const { rows: [movContabil] } = await client.query(`
  SELECT
    COALESCE(SUM(CASE WHEN cc_d.codigo LIKE '1.1.1%' THEN ll.valor ELSE 0 END), 0) as debitos,
    COALESCE(SUM(CASE WHEN cc_c.codigo LIKE '1.1.1%' THEN ll.valor ELSE 0 END), 0) as creditos
  FROM linhas_lancamento ll
  JOIN lancamentos l ON l.id = ll."lancamentoId"
  JOIN contas_contabeis cc_d ON cc_d.id = ll."contaDebitoId"
  JOIN contas_contabeis cc_c ON cc_c.id = ll."contaCreditoId"
  WHERE l.data <= '${dataFim}'::date
    AND l.estornado = false AND l."estornoDeId" IS NULL
`);
const movNet = Number(movContabil.debitos) - Number(movContabil.creditos);
console.log(`\n  Movimentos contábeis 1.1.1: D:${Number(movContabil.debitos).toFixed(2)} C:${Number(movContabil.creditos).toFixed(2)} Net:${movNet.toFixed(2)}`);

const caixaContabil = saldoInicialBancos + movNet;
console.log(`  Caixa contábil (SI + mov): ${caixaContabil.toFixed(2)}`);

// 1c. Overcount PIX: vendas PIX com lançamento D:Nubank mas pagamento pendente
const { rows: pixOvercount } = await client.query(`
  SELECT v.id, v."valorFinal", v."statusPagamento", v."formaPagamento",
         COALESCE(pg_total.total_pago, 0) as pago,
         CASE WHEN EXISTS (
           SELECT 1 FROM lancamentos l WHERE l."vendaId" = v.id AND l.estornado = false AND l."estornoDeId" IS NULL
         ) THEN true ELSE false END as tem_lancamento
  FROM vendas v
  LEFT JOIN LATERAL (
    SELECT SUM(pg.valor) as total_pago FROM pagamentos pg WHERE pg."vendaId" = v.id AND pg.data <= '${dataFim}'::date
  ) pg_total ON true
  WHERE v.cancelada = false
    AND v."formaPagamento" = 'PIX'
    AND v."statusPagamento" IN ('NAO_PAGO', 'PARCIAL')
    AND v."dataVenda" <= '${dataFim}'::date
`);
let totalOvercount = 0;
for (const v of pixOvercount) {
  if (v.tem_lancamento) {
    const pendente = Number(v.valorFinal) - Number(v.pago);
    totalOvercount += pendente;
    console.log(`  PIX overcount: ${v.id.slice(-8)} | R$${pendente.toFixed(2)} (Final:${Number(v.valorFinal).toFixed(2)} Pago:${Number(v.pago).toFixed(2)})`);
  }
}
console.log(`  TOTAL Overcount PIX: ${totalOvercount.toFixed(2)}`);

// 1d. Pagamentos a fornecedores
const { rows: [pagForn] } = await client.query(`
  SELECT COALESCE(SUM(valor), 0) as total
  FROM pagamentos_fornecedor
  WHERE data <= '${dataFim}'::date
`);
const totalPagForn = Number(pagForn.total);
console.log(`\n  Pagamentos a Fornecedores: ${totalPagForn.toFixed(2)}`);

// 1e. Repasses feitos
const { rows: [repFeitos] } = await client.query(`
  SELECT COALESCE(SUM("valorRepasseFeito"), 0) as total
  FROM vendas
  WHERE cancelada = false
`);
const totalRepasses = Number(repFeitos.total);
console.log(`  Repasses feitos: ${totalRepasses.toFixed(2)}`);

// CAIXA FINAL
const caixaNova = caixaContabil - totalOvercount - totalPagForn - totalRepasses;
console.log(`\n  CAIXA NOVA = ${caixaContabil.toFixed(2)} - ${totalOvercount.toFixed(2)} - ${totalPagForn.toFixed(2)} - ${totalRepasses.toFixed(2)}`);
console.log(`  CAIXA NOVA = ${caixaNova.toFixed(2)}`);

// =============================================
// 2. CONTAS A RECEBER (nova fórmula - ajuste MDR cartão)
// =============================================
console.log("\n=== 2. CONTAS A RECEBER (nova fórmula) ===\n");

const { rows: vendasPendentes } = await client.query(`
  SELECT v."formaPagamento", v."valorFinal", v."taxaMDR",
         COALESCE(pg_total.total_pago, 0) as pago
  FROM vendas v
  LEFT JOIN LATERAL (
    SELECT SUM(pg.valor) as total_pago FROM pagamentos pg WHERE pg."vendaId" = v.id AND pg.data <= '${dataFim}'::date
  ) pg_total ON true
  WHERE v.cancelada = false
    AND v."statusPagamento" IN ('NAO_PAGO', 'PARCIAL')
    AND v."dataVenda" <= '${dataFim}'::date
`);

let receberPIX = 0;
let receberCartao = 0;
for (const v of vendasPendentes) {
  const pendente = Number(v.valorFinal) - Number(v.pago);
  if (pendente <= 0) continue;
  if (v.formaPagamento === "PIX") {
    receberPIX += pendente;
  } else {
    const mdrPct = Number(v.taxaMDR || 0) / 100;
    receberCartao += pendente * (1 - mdrPct);
  }
}
const contasReceber = receberPIX + receberCartao;
console.log(`  PIX (bruto): ${receberPIX.toFixed(2)}`);
console.log(`  Cartão (líquido de MDR): ${receberCartao.toFixed(2)}`);
console.log(`  TOTAL Contas a Receber: ${contasReceber.toFixed(2)}`);

// =============================================
// 3. ESTOQUE (sem mudança)
// =============================================
const { rows: [est] } = await client.query(`
  SELECT COALESCE(SUM("valorCompra" + COALESCE("custoManutencao", 0)), 0) as total
  FROM pecas
  WHERE arquivado = false AND status IN ('DISPONIVEL', 'EM_TRANSITO', 'REVISAO') AND "origemTipo" = 'COMPRA'
`);
const estoque = Number(est.total);
console.log(`\n=== 3. ESTOQUE: ${estoque.toFixed(2)} ===`);

// =============================================
// 4. FORNECEDORES (sem mudança)
// =============================================
const { rows: [rep] } = await client.query(`
  SELECT COALESCE(SUM("valorRepasseDevido" - COALESCE("valorRepasseFeito", 0)), 0) as total
  FROM vendas WHERE cancelada = false AND "statusRepasse" IN ('PENDENTE', 'PARCIAL')
`);
const repassePend = Number(rep.total);

const { rows: [comp] } = await client.query(`
  SELECT COALESCE(SUM("valorCompra" - COALESCE("valorPagoFornecedor", 0)), 0) as total
  FROM pecas WHERE "origemTipo" = 'COMPRA' AND "statusPagamentoFornecedor" IN ('NAO_PAGO', 'PARCIAL') AND arquivado = false
`);
const comprasPagar = Number(comp.total);
const fornecedores = repassePend + comprasPagar;
console.log(`\n=== 4. FORNECEDORES: ${fornecedores.toFixed(2)} (Repasses: ${repassePend.toFixed(2)} + Compras: ${comprasPagar.toFixed(2)}) ===`);

// =============================================
// 5. OBRIGAÇÕES FISCAIS (contábil)
// =============================================
const { rows: saldosFiscais } = await client.query(`
  WITH movs AS (
    SELECT cc.codigo,
      COALESCE(SUM(CASE WHEN ll."contaCreditoId" = cc.id THEN ll.valor ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN ll."contaDebitoId" = cc.id THEN ll.valor ELSE 0 END), 0) as saldo
    FROM contas_contabeis cc
    LEFT JOIN linhas_lancamento ll ON (ll."contaDebitoId" = cc.id OR ll."contaCreditoId" = cc.id)
    LEFT JOIN lancamentos l ON l.id = ll."lancamentoId" AND l.data <= '${dataFim}'::date AND l.estornado = false AND l."estornoDeId" IS NULL
    WHERE cc.codigo LIKE '2.1.2%'
    GROUP BY cc.id, cc.codigo
  )
  SELECT COALESCE(SUM(saldo), 0) as total FROM movs
`);
const obrigFiscais = Number(saldosFiscais[0].total);
console.log(`\n=== 5. OBRIGAÇÕES FISCAIS: ${obrigFiscais.toFixed(2)} ===`);

// =============================================
// 6. RESULTADO (DRE contábil)
// =============================================
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
  )
  SELECT codigo,
    CASE WHEN natureza = 'DEVEDORA' THEN deb - cred ELSE cred - deb END as saldo
  FROM movs ORDER BY codigo
`);

let receitas31 = 0;
let deducoes32 = 0;
let custos4 = 0;
for (const s of saldosDRE) {
  const saldo = Number(s.saldo);
  if (s.codigo.startsWith("3.1")) receitas31 += saldo;
  else if (s.codigo.startsWith("3.2")) deducoes32 += saldo;
  else if (s.codigo.startsWith("4")) custos4 += saldo;
}
const resultado = receitas31 - deducoes32 - custos4;
console.log(`\n=== 6. RESULTADO DRE ===`);
console.log(`  Receitas (3.1): ${receitas31.toFixed(2)}`);
console.log(`  Deduções (3.2): ${deducoes32.toFixed(2)}`);
console.log(`  Custos/Despesas (4): ${custos4.toFixed(2)}`);
console.log(`  RESULTADO: ${resultado.toFixed(2)}`);

// =============================================
// 7. Capital Social e PL
// =============================================
const capitalSocial = 70273.40;
const lucrosAcumulados = 0; // from contábil 2.3.2
const distribuicoes = 0; // from contábil 2.3.3
const pl = capitalSocial + lucrosAcumulados + resultado - distribuicoes;
console.log(`\n=== 7. PATRIMÔNIO LÍQUIDO ===`);
console.log(`  Capital Social: ${capitalSocial.toFixed(2)}`);
console.log(`  Resultado: ${resultado.toFixed(2)}`);
console.log(`  PL: ${pl.toFixed(2)}`);

// =============================================
// 8. BALANÇO FINAL
// =============================================
const totalAtivo = caixaNova + contasReceber + estoque;
const totalPassivo = fornecedores + obrigFiscais + pl;

console.log(`\n========================================`);
console.log(`  BALANÇO PATRIMONIAL (NOVA LÓGICA)`);
console.log(`========================================`);
console.log(`  ATIVO:`);
console.log(`    Caixa:            ${caixaNova.toFixed(2)}`);
console.log(`    Contas a Receber: ${contasReceber.toFixed(2)}`);
console.log(`    Estoque:          ${estoque.toFixed(2)}`);
console.log(`    TOTAL ATIVO:      ${totalAtivo.toFixed(2)}`);
console.log(`  PASSIVO + PL:`);
console.log(`    Fornecedores:     ${fornecedores.toFixed(2)}`);
console.log(`    Obrigações Fisc.: ${obrigFiscais.toFixed(2)}`);
console.log(`    PL:               ${pl.toFixed(2)}`);
console.log(`    TOTAL PASSIVO:    ${totalPassivo.toFixed(2)}`);
console.log(`  ============================================`);
console.log(`  DESCASAMENTO:       ${(totalAtivo - totalPassivo).toFixed(2)}`);
console.log(`  EQUILIBRADO:        ${Math.abs(totalAtivo - totalPassivo) < 0.02 ? 'SIM ✅' : 'NÃO ❌'}`);
console.log(`  ============================================`);

await client.end();
