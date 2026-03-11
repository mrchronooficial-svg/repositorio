import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const CAPITAL_SOCIAL = 70273.40;
const dataFim = "2026-02-28";

// =============================================
// FUNÇÃO: Calcular balanço simplificado
// =============================================
async function calcularBalanco(label) {
  // CAIXA
  const { rows: [pixAgg] } = await client.query(`
    SELECT COALESCE(SUM(pg.valor), 0) as total FROM pagamentos pg
    JOIN vendas v ON v.id = pg."vendaId"
    WHERE v.cancelada = false AND v."formaPagamento" = 'PIX' AND pg.data <= '${dataFim}'::date
  `);
  const { rows: cartaoPags } = await client.query(`
    SELECT pg.valor, v."taxaMDR" FROM pagamentos pg
    JOIN vendas v ON v.id = pg."vendaId"
    WHERE v.cancelada = false AND v."formaPagamento" IN ('CREDITO_VISTA', 'CREDITO_PARCELADO') AND pg.data <= '${dataFim}'::date
  `);
  let cashInCartao = 0;
  for (const p of cartaoPags) cashInCartao += Number(p.valor) * (1 - Number(p.taxaMDR || 0) / 100);

  const { rows: [pf] } = await client.query(`SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos_fornecedor WHERE data <= '${dataFim}'::date`);
  const { rows: [rep] } = await client.query(`SELECT COALESCE(SUM("valorRepasseFeito"), 0) as total FROM vendas WHERE cancelada = false`);

  const { rows: [nonSaleOut] } = await client.query(`
    SELECT COALESCE(SUM(ll.valor), 0) as total FROM linhas_lancamento ll
    JOIN lancamentos l ON l.id = ll."lancamentoId"
    JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
    WHERE cc.codigo LIKE '1.1.1%' AND l."vendaId" IS NULL AND l.estornado = false AND l."estornoDeId" IS NULL AND l.data <= '${dataFim}'::date
  `);
  const { rows: [nonSaleIn] } = await client.query(`
    SELECT COALESCE(SUM(ll.valor), 0) as total FROM linhas_lancamento ll
    JOIN lancamentos l ON l.id = ll."lancamentoId"
    JOIN contas_contabeis cc ON cc.id = ll."contaDebitoId"
    WHERE cc.codigo LIKE '1.1.1%' AND l."vendaId" IS NULL AND l.estornado = false AND l."estornoDeId" IS NULL AND l.data <= '${dataFim}'::date
  `);

  const caixa = CAPITAL_SOCIAL + Number(pixAgg.total) + cashInCartao - Number(pf.total) - Number(rep.total) + Number(nonSaleIn.total) - Number(nonSaleOut.total);

  // CONTAS A RECEBER
  const { rows: vendasPend } = await client.query(`
    SELECT v."formaPagamento", v."valorFinal", v."taxaMDR", COALESCE(pg_total.total_pago, 0) as pago
    FROM vendas v
    LEFT JOIN LATERAL (SELECT SUM(pg.valor) as total_pago FROM pagamentos pg WHERE pg."vendaId" = v.id AND pg.data <= '${dataFim}'::date) pg_total ON true
    WHERE v.cancelada = false AND v."statusPagamento" IN ('NAO_PAGO', 'PARCIAL') AND v."dataVenda" <= '${dataFim}'::date
  `);
  let contasReceber = 0;
  for (const v of vendasPend) {
    const pendente = Number(v.valorFinal) - Number(v.pago);
    if (pendente <= 0) continue;
    if (v.formaPagamento === "PIX") contasReceber += pendente;
    else contasReceber += pendente * (1 - Number(v.taxaMDR || 0) / 100);
  }

  // ESTOQUE
  const { rows: [est] } = await client.query(`
    SELECT COALESCE(SUM("valorCompra" + COALESCE("custoManutencao", 0)), 0) as total
    FROM pecas WHERE arquivado = false AND status IN ('DISPONIVEL', 'EM_TRANSITO', 'REVISAO') AND "origemTipo" = 'COMPRA'
  `);
  const estoque = Number(est.total);

  const totalAtivo = caixa + contasReceber + estoque;

  // FORNECEDORES
  const { rows: [repPend] } = await client.query(`
    SELECT COALESCE(SUM("valorRepasseDevido" - COALESCE("valorRepasseFeito", 0)), 0) as total
    FROM vendas WHERE cancelada = false AND "statusRepasse" IN ('PENDENTE', 'PARCIAL')
  `);
  const { rows: [compPend] } = await client.query(`
    SELECT COALESCE(SUM("valorCompra" - COALESCE("valorPagoFornecedor", 0)), 0) as total
    FROM pecas WHERE "origemTipo" = 'COMPRA' AND "statusPagamentoFornecedor" IN ('NAO_PAGO', 'PARCIAL') AND arquivado = false
  `);
  const fornecedores = Number(repPend.total) + Number(compPend.total);

  // OBRIGAÇÕES FISCAIS
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

  const passivoCirculante = fornecedores + obrigFiscais;
  const resultadoPlug = totalAtivo - passivoCirculante - CAPITAL_SOCIAL;
  const pl = CAPITAL_SOCIAL + resultadoPlug;
  const totalPassivo = passivoCirculante + pl;
  const descasamento = totalAtivo - totalPassivo;

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(50)}`);
  console.log(`  Caixa:            ${caixa.toFixed(2)}`);
  console.log(`  Contas a Receber: ${contasReceber.toFixed(2)}`);
  console.log(`  Estoque:          ${estoque.toFixed(2)}`);
  console.log(`  TOTAL ATIVO:      ${totalAtivo.toFixed(2)}`);
  console.log(`  ---`);
  console.log(`  Fornecedores:     ${fornecedores.toFixed(2)}`);
  console.log(`  Obrig. Fiscais:   ${obrigFiscais.toFixed(2)}`);
  console.log(`  Capital Social:   ${CAPITAL_SOCIAL.toFixed(2)}`);
  console.log(`  Resultado (plug): ${resultadoPlug.toFixed(2)}`);
  console.log(`  TOTAL PASSIVO:    ${totalPassivo.toFixed(2)}`);
  console.log(`  DESCASAMENTO:     ${descasamento.toFixed(2)} ${Math.abs(descasamento) < 0.02 ? "✅" : "❌"}`);

  return { caixa, contasReceber, estoque, totalAtivo, fornecedores, obrigFiscais, resultadoPlug, totalPassivo };
}

// =============================================
// SIMULAÇÃO
// =============================================

try {
  // 0. Balanço antes
  const antes = await calcularBalanco("BALANÇO ANTES DA SIMULAÇÃO");

  // 1. Buscar fornecedor e cliente existentes
  const { rows: [fornecedor] } = await client.query(`SELECT id FROM fornecedores LIMIT 1`);
  const { rows: [clienteRow] } = await client.query(`SELECT id FROM clientes LIMIT 1`);
  const { rows: [adminUser] } = await client.query(`SELECT id FROM "user" WHERE nivel = 'ADMINISTRADOR' LIMIT 1`);

  if (!fornecedor || !clienteRow || !adminUser) {
    console.error("Falta fornecedor, cliente ou admin no banco!");
    process.exit(1);
  }

  // 2. Gerar próximo SKU
  const { rows: [lastSku] } = await client.query(`SELECT sku FROM pecas ORDER BY sku DESC LIMIT 1`);
  const nextNum = lastSku ? parseInt(lastSku.sku.replace("MRC-", "").split("-")[0]) + 1 : 1;
  const sku = `MRC-${String(nextNum).padStart(4, "0")}`;

  // 3. Criar peça (compra não paga)
  const pecaId = `sim_peca_${Date.now()}`;
  await client.query(`
    INSERT INTO pecas (id, sku, "skuBase", marca, modelo, "tamanhoCaixa", "valorCompra", "valorEstimadoVenda", "origemTipo", "origemCanal",
      status, localizacao, "fornecedorId", arquivado, "statusPagamentoFornecedor", "valorPagoFornecedor", "createdAt", "updatedAt")
    VALUES ($1, $2, $2, 'Seiko', 'SKX007-SIM', 42, 2000.00, 3500.00, 'COMPRA', 'PESSOA_FISICA',
      'DISPONIVEL', 'Rafael', $3, false, 'NAO_PAGO', 0, NOW(), NOW())
  `, [pecaId, sku, fornecedor.id]);

  console.log(`\n>>> PEÇA CRIADA: ${sku} (R$2.000, não paga ao fornecedor)`);

  // 4. Balanço após compra
  const aposCompra = await calcularBalanco("BALANÇO APÓS CADASTRO DA PEÇA (compra não paga)");

  console.log(`\n  Δ Estoque:      +${(aposCompra.estoque - antes.estoque).toFixed(2)} (esperado: +2000.00)`);
  console.log(`  Δ Fornecedores: +${(aposCompra.fornecedores - antes.fornecedores).toFixed(2)} (esperado: +2000.00)`);
  console.log(`  Δ Caixa:        ${(aposCompra.caixa - antes.caixa).toFixed(2)} (esperado: 0.00)`);

  // 5. Criar venda PIX (sem receber pagamento ainda)
  const vendaId = `sim_venda_${Date.now()}`;
  const valorFinal = 3500.00;
  const taxaMDR = 0;
  const dataVenda = new Date().toISOString().split("T")[0];

  await client.query(`
    INSERT INTO vendas (id, "pecaId", "clienteId", "valorOriginal", "valorFinal", "formaPagamento", "taxaMDR",
      "statusPagamento", "dataVenda", cancelada, "createdAt", "updatedAt", parcelas)
    VALUES ($1, $2, $3, $4, $4, 'PIX', 0, 'NAO_PAGO', $5::date, false, NOW(), NOW(), 1)
  `, [vendaId, pecaId, clienteRow.id, valorFinal, dataVenda]);

  // Atualizar status da peça para VENDIDA
  await client.query(`UPDATE pecas SET status = 'VENDIDA' WHERE id = $1`, [pecaId]);

  // 6. Criar lançamentos contábeis da venda
  // Buscar contas contábeis necessárias
  const contasNeeded = ["1.1.1.01", "3.1.1", "3.2.2", "2.1.2.01", "4.1.3", "1.1.3.01"];
  const contas = {};
  for (const cod of contasNeeded) {
    const { rows: [c] } = await client.query(`SELECT id FROM contas_contabeis WHERE codigo = $1`, [cod]);
    if (c) contas[cod] = c.id;
  }

  // Lançamento 1: Receita (D: Nubank, C: Receita Estoque Próprio)
  const lancReceitaId = `sim_lanc_rec_${Date.now()}`;
  await client.query(`
    INSERT INTO lancamentos (id, descricao, data, "vendaId", estornado, "estornoDeId", "userId", tipo, "createdAt", "updatedAt")
    VALUES ($1, $2, $3::date, $4, false, NULL, $5, 'AUTOMATICO_VENDA', NOW(), NOW())
  `, [lancReceitaId, `Receita venda ${sku}`, dataVenda, vendaId, adminUser.id]);

  await client.query(`
    INSERT INTO linhas_lancamento (id, "lancamentoId", "contaDebitoId", "contaCreditoId", valor, historico)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [`sim_ll_rec_${Date.now()}`, lancReceitaId, contas["1.1.1.01"], contas["3.1.1"], valorFinal, `Receita venda PIX ${sku}`]);

  // Lançamento 2: Simples Nacional (alíquota fixa 6% para simplificar)
  const aliquotaSimples = 0.06;
  const valorSimples = Math.round(valorFinal * aliquotaSimples * 100) / 100;
  const lancSimplesId = `sim_lanc_sn_${Date.now()}`;
  await client.query(`
    INSERT INTO lancamentos (id, descricao, data, "vendaId", estornado, "estornoDeId", "userId", tipo, "createdAt", "updatedAt")
    VALUES ($1, $2, $3::date, $4, false, NULL, $5, 'AUTOMATICO_VENDA', NOW(), NOW())
  `, [lancSimplesId, `Simples Nacional ${sku}`, dataVenda, vendaId, adminUser.id]);

  await client.query(`
    INSERT INTO linhas_lancamento (id, "lancamentoId", "contaDebitoId", "contaCreditoId", valor, historico)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [`sim_ll_sn_${Date.now()}`, lancSimplesId, contas["3.2.2"], contas["2.1.2.01"], valorSimples, `Simples Nacional ${sku}`]);

  // Lançamento 3: CMV (D: 4.1.3 Custo PF, C: 1.1.3.01 Estoque)
  const lancCMVId = `sim_lanc_cmv_${Date.now()}`;
  await client.query(`
    INSERT INTO lancamentos (id, descricao, data, "vendaId", estornado, "estornoDeId", "userId", tipo, "createdAt", "updatedAt")
    VALUES ($1, $2, $3::date, $4, false, NULL, $5, 'AUTOMATICO_VENDA', NOW(), NOW())
  `, [lancCMVId, `CMV ${sku}`, dataVenda, vendaId, adminUser.id]);

  await client.query(`
    INSERT INTO linhas_lancamento (id, "lancamentoId", "contaDebitoId", "contaCreditoId", valor, historico)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [`sim_ll_cmv_${Date.now()}`, lancCMVId, contas["4.1.3"], contas["1.1.3.01"], 2000.00, `CMV ${sku}`]);

  console.log(`\n>>> VENDA CRIADA: ${sku} por R$3.500 (PIX, não recebido)`);
  console.log(`    Lançamentos: Receita R$3.500 | Simples R$${valorSimples} | CMV R$2.000`);

  // 7. Balanço após venda (sem receber pagamento)
  const aposVenda = await calcularBalanco("BALANÇO APÓS VENDA (sem receber pagamento)");

  console.log(`\n  Δ Estoque:        ${(aposVenda.estoque - aposCompra.estoque).toFixed(2)} (esperado: -2000.00, peça saiu)`);
  console.log(`  Δ Contas Receber: +${(aposVenda.contasReceber - aposCompra.contasReceber).toFixed(2)} (esperado: +3500.00, PIX pendente)`);
  console.log(`  Δ Obrig Fiscais:  +${(aposVenda.obrigFiscais - aposCompra.obrigFiscais).toFixed(2)} (esperado: +${valorSimples})`);
  console.log(`  Δ Caixa:          ${(aposVenda.caixa - aposCompra.caixa).toFixed(2)} (esperado: 0.00, não recebeu)`);

  // 8. Simular recebimento do pagamento PIX
  const pagId = `sim_pag_${Date.now()}`;
  await client.query(`
    INSERT INTO pagamentos (id, "vendaId", valor, data, "createdAt")
    VALUES ($1, $2, $3, $4::date, NOW())
  `, [pagId, vendaId, valorFinal, dataVenda]);

  await client.query(`UPDATE vendas SET "statusPagamento" = 'PAGO' WHERE id = $1`, [vendaId]);

  console.log(`\n>>> PAGAMENTO RECEBIDO: R$3.500 (PIX)`);

  // 9. Balanço após recebimento
  const aposRecebimento = await calcularBalanco("BALANÇO APÓS RECEBER PAGAMENTO");

  console.log(`\n  Δ Contas Receber: ${(aposRecebimento.contasReceber - aposVenda.contasReceber).toFixed(2)} (esperado: -3500.00)`);
  console.log(`  Δ Caixa:          +${(aposRecebimento.caixa - aposVenda.caixa).toFixed(2)} (esperado: +3500.00)`);

  // =============================================
  // LIMPEZA — desfazer tudo
  // =============================================
  console.log(`\n>>> LIMPANDO dados simulados...`);

  await client.query(`DELETE FROM pagamentos WHERE id = $1`, [pagId]);
  await client.query(`DELETE FROM linhas_lancamento WHERE "lancamentoId" IN ($1, $2, $3)`, [lancReceitaId, lancSimplesId, lancCMVId]);
  await client.query(`DELETE FROM lancamentos WHERE id IN ($1, $2, $3)`, [lancReceitaId, lancSimplesId, lancCMVId]);
  await client.query(`DELETE FROM vendas WHERE id = $1`, [vendaId]);
  await client.query(`DELETE FROM pecas WHERE id = $1`, [pecaId]);

  // Verificar que voltou ao original
  const aposLimpeza = await calcularBalanco("BALANÇO APÓS LIMPEZA (deve ser igual ao inicial)");

  console.log(`\n  Δ Total Ativo:  ${(aposLimpeza.totalAtivo - antes.totalAtivo).toFixed(2)} (esperado: 0.00)`);
  console.log(`  Δ Total Passivo: ${(aposLimpeza.totalPassivo - antes.totalPassivo).toFixed(2)} (esperado: 0.00)`);

} catch (err) {
  console.error("ERRO:", err);
} finally {
  await client.end();
}
