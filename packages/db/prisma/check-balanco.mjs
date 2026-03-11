import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: "../../apps/web/.env" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1. Vendas com pagamento pendente (aparecem em Contas a Receber operacional)
console.log("=== VENDAS PENDENTES (Contas a Receber operacional) ===");
const { rows: pendentes } = await client.query(`
  SELECT v.id, v."dataVenda", v."valorFinal", v."formaPagamento", v."statusPagamento",
         v."taxaMDR", v."valorRepasseDevido", v."statusRepasse",
         p.sku, p."origemTipo",
         COALESCE(SUM(pg.valor), 0) as total_pago
  FROM vendas v
  JOIN pecas p ON p.id = v."pecaId"
  LEFT JOIN pagamentos pg ON pg."vendaId" = v.id
  WHERE v.cancelada = false AND v."statusPagamento" IN ('NAO_PAGO', 'PARCIAL')
  GROUP BY v.id, v."dataVenda", v."valorFinal", v."formaPagamento", v."statusPagamento",
           v."taxaMDR", v."valorRepasseDevido", v."statusRepasse", p.sku, p."origemTipo"
  ORDER BY v."dataVenda" DESC
`);
for (const v of pendentes) {
  const pendente = Number(v.valorFinal) - Number(v.total_pago);
  console.log(`  ${v.sku} | ${v.dataVenda.toISOString().slice(0,10)} | ${v.formaPagamento} | Final: ${Number(v.valorFinal).toFixed(2)} | Pago: ${Number(v.total_pago).toFixed(2)} | Pendente: ${pendente.toFixed(2)} | StatusPgto: ${v.statusPagamento} | Origem: ${v.origemTipo} | Repasse: ${Number(v.valorRepasseDevido||0).toFixed(2)} | StatusRepasse: ${v.statusRepasse}`);
}

// 2. Para cada venda pendente, mostrar seus lançamentos contábeis
console.log("\n=== LANÇAMENTOS DAS VENDAS PENDENTES ===");
for (const v of pendentes) {
  console.log(`\n  --- ${v.sku} (${v.formaPagamento}, ${v.statusPagamento}) ---`);
  const { rows: lancs } = await client.query(`
    SELECT l.descricao, l.estornado, l."estornoDeId",
           ll.valor, cd.codigo as cod_deb, cc.codigo as cod_cred
    FROM lancamentos l
    JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
    JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
    JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
    WHERE l."vendaId" = $1
      AND l.estornado = false AND l."estornoDeId" IS NULL
    ORDER BY l."createdAt"
  `, [v.id]);
  for (const l of lancs) {
    console.log(`    D:${l.cod_deb} C:${l.cod_cred} R$${Number(l.valor).toFixed(2)} | ${l.descricao}`);
  }
}

// 3. Vendas com repasse pendente (aparecem em Fornecedores operacional)
console.log("\n=== VENDAS COM REPASSE PENDENTE (Fornecedores operacional) ===");
const { rows: repassePend } = await client.query(`
  SELECT v.id, p.sku, v."dataVenda", v."valorFinal", v."formaPagamento",
         v."valorRepasseDevido", v."valorRepasseFeito", v."statusRepasse"
  FROM vendas v
  JOIN pecas p ON p.id = v."pecaId"
  WHERE v.cancelada = false AND v."statusRepasse" IN ('PENDENTE', 'PARCIAL')
  ORDER BY v."dataVenda" DESC
`);
let totalRepassePend = 0;
for (const v of repassePend) {
  const pend = Number(v.valorRepasseDevido) - Number(v.valorRepasseFeito);
  totalRepassePend += pend;
  console.log(`  ${v.sku} | ${v.dataVenda.toISOString().slice(0,10)} | ${v.formaPagamento} | Devido: ${Number(v.valorRepasseDevido).toFixed(2)} | Feito: ${Number(v.valorRepasseFeito).toFixed(2)} | Pend: ${pend.toFixed(2)}`);
}
console.log(`  TOTAL REPASSE PENDENTE: ${totalRepassePend.toFixed(2)}`);

// 4. Verificar inconsistência: vendas PIX com pagamento pendente
// (contábil registra D Nubank, mas operacional diz que não recebeu)
console.log("\n=== PROBLEMA POTENCIAL: PIX/vendas com D:Nubank mas pagamento pendente ===");
for (const v of pendentes) {
  if (v.formaPagamento === "PIX") {
    const pendente = Number(v.valorFinal) - Number(v.total_pago);
    console.log(`  ⚠️  ${v.sku}: PIX sale, contábil debita Nubank em R$${Number(v.valorFinal).toFixed(2)} mas operacional diz pendente R$${pendente.toFixed(2)}`);
    console.log(`       → CAIXA inflada em R$${Number(v.valorFinal).toFixed(2)} E Contas a Receber inflada em R$${pendente.toFixed(2)}`);
  }
}

// 5. Comparar com o que estava no dia 13/02 (sábado anterior)
console.log("\n=== VENDAS REGISTRADAS DESDE 14/02 ===");
const { rows: vendasRecentes } = await client.query(`
  SELECT v.id, v."dataVenda", v."valorFinal", v."formaPagamento", v."statusPagamento",
         v."taxaMDR", v.cancelada, v."statusRepasse",
         v."valorRepasseDevido", v."valorRepasseFeito",
         p.sku, p."origemTipo", p."valorCompra", p."custoManutencao"
  FROM vendas v
  JOIN pecas p ON p.id = v."pecaId"
  WHERE v."dataVenda" >= '2026-02-14'
  ORDER BY v."dataVenda" ASC
`);
for (const v of vendasRecentes) {
  console.log(`  ${v.sku} | ${v.dataVenda.toISOString().slice(0,10)} | ${v.formaPagamento} | R$${Number(v.valorFinal).toFixed(2)} | ${v.statusPagamento} | ${v.origemTipo} | Cancel:${v.cancelada}`);
}

// 6. Todas as vendas NAO_PAGO registradas como PIX
console.log("\n=== TODAS AS VENDAS PIX COM STATUS != PAGO ===");
const { rows: pixNaoPago } = await client.query(`
  SELECT p.sku, v."dataVenda", v."valorFinal", v."statusPagamento", v."formaPagamento",
         COALESCE(SUM(pg.valor), 0) as pago
  FROM vendas v
  JOIN pecas p ON p.id = v."pecaId"
  LEFT JOIN pagamentos pg ON pg."vendaId" = v.id
  WHERE v.cancelada = false
    AND v."formaPagamento" = 'PIX'
    AND v."statusPagamento" != 'PAGO'
  GROUP BY p.sku, v."dataVenda", v."valorFinal", v."statusPagamento", v."formaPagamento"
  ORDER BY v."dataVenda"
`);
for (const v of pixNaoPago) {
  console.log(`  ${v.sku} | ${v.dataVenda.toISOString().slice(0,10)} | Final: ${Number(v.valorFinal).toFixed(2)} | Pago: ${Number(v.pago).toFixed(2)} | Status: ${v.statusPagamento}`);
}

// 7. Check despesas recorrentes - all months
console.log("\n=== DESPESAS RECORRENTES POR MÊS (duplicatas?) ===");
const { rows: despByMonth } = await client.query(`
  SELECT
    SUBSTRING(l.descricao FROM '\\d+/\\d+$') as periodo,
    COUNT(*) as qtd_lancamentos,
    SUM(ll.valor) as total
  FROM lancamentos l
  JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  WHERE l.descricao LIKE 'Despesa recorrente%'
    AND l.estornado = false AND l."estornoDeId" IS NULL
  GROUP BY SUBSTRING(l.descricao FROM '\\d+/\\d+$')
  ORDER BY periodo
`);
for (const d of despByMonth) {
  const flag = Number(d.qtd_lancamentos) > 5 ? " ⚠️ PROVÁVEL DUPLICATA" : "";
  console.log(`  ${d.periodo}: ${d.qtd_lancamentos} lançamentos = R$${Number(d.total).toFixed(2)}${flag}`);
}

await client.end();
