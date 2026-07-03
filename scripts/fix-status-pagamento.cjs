// Correcao de dados: recalcula statusPagamento de todas as vendas nao canceladas
// com base no saldo devedor real (arredondado a centavos), corrigindo:
//   - vendas PAGO com saldo devedor real (nao apareciam em "a receber")
//   - vendas PARCIAL/NAO_PAGO ja quitadas (presas, impossiveis de fechar)
//
// Usa a MESMA regra do backend (packages/api/src/utils/pagamento.ts).
// Rode com:  node scripts/fix-status-pagamento.cjs          (dry-run, so mostra)
//            node scripts/fix-status-pagamento.cjs --apply   (aplica as mudancas)
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "apps", "web", ".env") });

const { Client } = require("pg");

const EPSILON = 0.005;
const r2 = (n) => Math.round(n * 100) / 100;
function calcularStatus(valorFinal, totalPago) {
  const saldo = r2(valorFinal - totalPago);
  if (saldo <= EPSILON) return "PAGO";
  if (r2(totalPago) > EPSILON) return "PARCIAL";
  return "NAO_PAGO";
}

(async () => {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL nao encontrado em apps/web/.env");
    process.exit(1);
  }
  console.log("Conectando em:", url.replace(/\/\/[^@]+@/, "//***@"));
  console.log(apply ? ">>> MODO APLICAR <<<" : ">>> DRY-RUN (use --apply para gravar) <<<");

  const client = new Client({ connectionString: url });
  await client.connect();

  const vendas = await client.query(`
    SELECT v.id, v."valorFinal", v."statusPagamento", p.sku, p.marca, p.modelo, c.nome AS cliente
    FROM vendas v
    JOIN pecas p ON p.id = v."pecaId"
    JOIN clientes c ON c.id = v."clienteId"
    WHERE v.cancelada = false
  `);
  const pagRes = await client.query(`
    SELECT "vendaId", COALESCE(SUM(valor),0) AS total FROM pagamentos GROUP BY "vendaId"
  `);
  const pagMap = new Map(pagRes.rows.map((r) => [r.vendaId, Number(r.total)]));

  const mudancas = [];
  for (const v of vendas.rows) {
    const valorFinal = Number(v.valorFinal);
    const pago = pagMap.get(v.id) || 0;
    const correto = calcularStatus(valorFinal, pago);
    if (correto !== v.statusPagamento) {
      mudancas.push({
        id: v.id,
        sku: v.sku,
        label: `${v.sku} | ${v.marca} ${v.modelo} | ${v.cliente} | final=${valorFinal.toFixed(2)} pago=${pago.toFixed(2)} saldo=${r2(valorFinal - pago).toFixed(2)} | ${v.statusPagamento} -> ${correto}`,
        novo: correto,
      });
    }
  }

  console.log(`\nVendas analisadas: ${vendas.rows.length}`);
  console.log(`Status a corrigir: ${mudancas.length}\n`);
  mudancas.forEach((m) => console.log("  " + m.label));

  if (apply && mudancas.length > 0) {
    for (const m of mudancas) {
      await client.query(`UPDATE vendas SET "statusPagamento" = $1 WHERE id = $2`, [m.novo, m.id]);
    }
    console.log(`\nOK: ${mudancas.length} venda(s) atualizada(s).`);
  } else if (!apply && mudancas.length > 0) {
    console.log(`\n(nada gravado — rode com --apply para aplicar)`);
  }

  await client.end();
})().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
