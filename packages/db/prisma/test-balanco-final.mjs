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

// Buscar SALDO_INICIAL_CAIXA
const { rows: [cfg] } = await client.query(`SELECT valor FROM configuracoes WHERE chave = 'SALDO_INICIAL_CAIXA'`);
const SALDO_INICIAL = Number(cfg?.valor || 105690.65);

// === CAIXA (nova fórmula com SALDO_INICIAL_CAIXA) ===
const { rows: [pix] } = await client.query(`SELECT COALESCE(SUM(pg.valor), 0) as t FROM pagamentos pg JOIN vendas v ON v.id = pg."vendaId" WHERE v.cancelada = false AND v."formaPagamento" = 'PIX' AND pg.data <= '${dataFim}'::date`);
const { rows: cartao } = await client.query(`SELECT pg.valor, v."taxaMDR" FROM pagamentos pg JOIN vendas v ON v.id = pg."vendaId" WHERE v.cancelada = false AND v."formaPagamento" IN ('CREDITO_VISTA','CREDITO_PARCELADO') AND pg.data <= '${dataFim}'::date`);
let cardNet = 0; for (const p of cartao) cardNet += Number(p.valor) * (1 - Number(p.taxaMDR||0)/100);
const { rows: [forn] } = await client.query(`SELECT COALESCE(SUM(valor),0) as t FROM pagamentos_fornecedor WHERE data <= '${dataFim}'::date`);
const { rows: [rep] } = await client.query(`SELECT COALESCE(SUM("valorRepasseFeito"),0) as t FROM vendas WHERE cancelada = false`);
const { rows: [nso] } = await client.query(`SELECT COALESCE(SUM(ll.valor),0) as t FROM linhas_lancamento ll JOIN lancamentos l ON l.id=ll."lancamentoId" JOIN contas_contabeis cc ON cc.id=ll."contaCreditoId" WHERE cc.codigo LIKE '1.1.1%' AND l."vendaId" IS NULL AND l.estornado=false AND l."estornoDeId" IS NULL AND l.data <= '${dataFim}'::date`);
const { rows: [nsi] } = await client.query(`SELECT COALESCE(SUM(ll.valor),0) as t FROM linhas_lancamento ll JOIN lancamentos l ON l.id=ll."lancamentoId" JOIN contas_contabeis cc ON cc.id=ll."contaDebitoId" WHERE cc.codigo LIKE '1.1.1%' AND l."vendaId" IS NULL AND l.estornado=false AND l."estornoDeId" IS NULL AND l.data <= '${dataFim}'::date`);

const caixa = SALDO_INICIAL + Number(pix.t) + cardNet - Number(forn.t) - Number(rep.t) + Number(nsi.t) - Number(nso.t);

// PagBank
const { rows: [pb] } = await client.query(`SELECT cb."saldoInicial" FROM contas_bancarias cb JOIN contas_contabeis cc ON cc.id = cb."contaContabilId" WHERE cc.codigo = '1.1.1.02'`);
const pagBank = Number(pb?.saldoInicial || 0);
const nubank = caixa - pagBank;

// Contas a Receber, Estoque, Fornecedores, ObrigFiscais (mesma lógica)
const { rows: vendasPend } = await client.query(`SELECT v."formaPagamento", v."valorFinal", v."taxaMDR", COALESCE(pg_total.total_pago, 0) as pago FROM vendas v LEFT JOIN LATERAL (SELECT SUM(pg.valor) as total_pago FROM pagamentos pg WHERE pg."vendaId" = v.id AND pg.data <= '${dataFim}'::date) pg_total ON true WHERE v.cancelada = false AND v."statusPagamento" IN ('NAO_PAGO', 'PARCIAL') AND v."dataVenda" <= '${dataFim}'::date`);
let contasReceber = 0;
for (const v of vendasPend) { const p = Number(v.valorFinal) - Number(v.pago); if (p <= 0) continue; contasReceber += v.formaPagamento === "PIX" ? p : p * (1 - Number(v.taxaMDR||0)/100); }

const { rows: [est] } = await client.query(`SELECT COALESCE(SUM("valorCompra" + COALESCE("custoManutencao", 0)), 0) as t FROM pecas WHERE arquivado = false AND status IN ('DISPONIVEL', 'EM_TRANSITO', 'REVISAO') AND "origemTipo" = 'COMPRA'`);
const estoque = Number(est.t);

const totalAtivo = caixa + contasReceber + estoque;

const { rows: [rp] } = await client.query(`SELECT COALESCE(SUM("valorRepasseDevido" - COALESCE("valorRepasseFeito", 0)), 0) as t FROM vendas WHERE cancelada = false AND "statusRepasse" IN ('PENDENTE', 'PARCIAL')`);
const { rows: [cp] } = await client.query(`SELECT COALESCE(SUM("valorCompra" - COALESCE("valorPagoFornecedor", 0)), 0) as t FROM pecas WHERE "origemTipo" = 'COMPRA' AND "statusPagamentoFornecedor" IN ('NAO_PAGO', 'PARCIAL') AND arquivado = false`);
const fornecedores = Number(rp.t) + Number(cp.t);

const { rows: [fisc] } = await client.query(`WITH movs AS (SELECT cc.id, COALESCE(SUM(CASE WHEN ll."contaCreditoId" = cc.id THEN ll.valor ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN ll."contaDebitoId" = cc.id THEN ll.valor ELSE 0 END), 0) as saldo FROM contas_contabeis cc LEFT JOIN linhas_lancamento ll ON (ll."contaDebitoId" = cc.id OR ll."contaCreditoId" = cc.id) LEFT JOIN lancamentos l ON l.id = ll."lancamentoId" AND l.data <= '${dataFim}'::date AND l.estornado = false AND l."estornoDeId" IS NULL WHERE cc.codigo LIKE '2.1.2%' GROUP BY cc.id) SELECT COALESCE(SUM(saldo), 0) as t FROM movs`);
const obrigFiscais = Number(fisc.t);

const passCirc = fornecedores + obrigFiscais;
const resultado = totalAtivo - passCirc - CAPITAL_SOCIAL;
const pl = CAPITAL_SOCIAL + resultado;
const totalPassivo = passCirc + pl;

console.log(`\n${"=".repeat(50)}`);
console.log(`  BALANÇO PATRIMONIAL FINAL`);
console.log(`${"=".repeat(50)}`);
console.log(`  ATIVO:`);
console.log(`    Caixa e Equivalentes:  ${caixa.toFixed(2)}`);
console.log(`      Nubank (Pix):        ${nubank.toFixed(2)}`);
console.log(`      PagBank (Cartão):    ${pagBank.toFixed(2)}`);
console.log(`    Contas a Receber:      ${contasReceber.toFixed(2)}`);
console.log(`    Estoque:               ${estoque.toFixed(2)}`);
console.log(`    TOTAL ATIVO:           ${totalAtivo.toFixed(2)}`);
console.log(`  PASSIVO + PL:`);
console.log(`    Fornecedores:          ${fornecedores.toFixed(2)}`);
console.log(`    Obrigações Fiscais:    ${obrigFiscais.toFixed(2)}`);
console.log(`    Capital Social:        ${CAPITAL_SOCIAL.toFixed(2)}`);
console.log(`    Resultado:             ${resultado.toFixed(2)}`);
console.log(`    PL:                    ${pl.toFixed(2)}`);
console.log(`    TOTAL PASSIVO:         ${totalPassivo.toFixed(2)}`);
console.log(`  ${"=".repeat(46)}`);
console.log(`  DESCASAMENTO:            ${(totalAtivo - totalPassivo).toFixed(2)} ${Math.abs(totalAtivo - totalPassivo) < 0.02 ? "✅" : "❌"}`);

await client.end();
