// Baixa automatica de saldo residual (centavos) de uma venda especifica.
// Registra um pagamento de ajuste igual ao saldo devedor arredondado e marca a venda como PAGO.
// Trava de seguranca: so aplica se o saldo residual for <= LIMITE_CENTAVOS.
//
//   node scripts/baixa-centavo.cjs MRC-0250            (dry-run)
//   node scripts/baixa-centavo.cjs MRC-0250 --apply    (aplica)
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "apps", "web", ".env") });
const { Client } = require("pg");

const LIMITE_CENTAVOS = 0.05; // so baixa residuos de ate 5 centavos
const r2 = (n) => Math.round(n * 100) / 100;

// Gera um id no formato cuid (c + 24 chars base36) para a PK de pagamentos.
function gerarCuid() {
  let s = "c";
  while (s.length < 25) s += crypto.randomBytes(8).readBigUInt64BE().toString(36);
  return s.slice(0, 25);
}

(async () => {
  const sku = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!sku) {
    console.error("Uso: node scripts/baixa-centavo.cjs <SKU> [--apply]");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL nao encontrado"); process.exit(1); }
  console.log("Conectando em:", url.replace(/\/\/[^@]+@/, "//***@"));
  console.log(apply ? ">>> MODO APLICAR <<<" : ">>> DRY-RUN <<<");

  const client = new Client({ connectionString: url });
  await client.connect();

  const vr = await client.query(`
    SELECT v.id, v."valorFinal", v."statusPagamento", p.sku, p.marca, p.modelo, c.nome AS cliente
    FROM vendas v
    JOIN pecas p ON p.id = v."pecaId"
    JOIN clientes c ON c.id = v."clienteId"
    WHERE p.sku = $1 AND v.cancelada = false
  `, [sku]);

  if (vr.rows.length === 0) { console.error(`Venda nao encontrada para SKU ${sku}`); await client.end(); process.exit(1); }
  if (vr.rows.length > 1) { console.error(`Mais de uma venda para SKU ${sku} — abortando`); await client.end(); process.exit(1); }

  const v = vr.rows[0];
  const pg = await client.query(`SELECT COALESCE(SUM(valor),0) AS total FROM pagamentos WHERE "vendaId" = $1`, [v.id]);
  const pago = Number(pg.rows[0].total);
  const valorFinal = Number(v.valorFinal);
  const saldo = r2(valorFinal - pago);

  console.log(`\n${v.sku} | ${v.marca} ${v.modelo} | ${v.cliente}`);
  console.log(`  valorFinal=${valorFinal.toFixed(2)}  pago=${pago.toFixed(2)}  saldo=${saldo.toFixed(2)}  status=${v.statusPagamento}`);

  if (saldo <= 0.005) { console.log("\nSaldo ja e zero — nada a baixar."); await client.end(); return; }
  if (saldo > LIMITE_CENTAVOS) {
    console.error(`\nSaldo ${saldo.toFixed(2)} acima do limite de baixa (${LIMITE_CENTAVOS.toFixed(2)}) — abortando por seguranca.`);
    await client.end(); process.exit(1);
  }

  console.log(`\nAcao: registrar pagamento de ajuste de R$ ${saldo.toFixed(2)} e marcar venda como PAGO.`);

  if (apply) {
    const id = gerarCuid();
    await client.query(
      `INSERT INTO pagamentos (id, "vendaId", valor, data, "createdAt") VALUES ($1, $2, $3, NOW(), NOW())`,
      [id, v.id, saldo]
    );
    await client.query(`UPDATE vendas SET "statusPagamento" = 'PAGO' WHERE id = $1`, [v.id]);
    console.log(`\nOK: baixa aplicada. Pagamento ${id} de R$ ${saldo.toFixed(2)} registrado; venda marcada como PAGO.`);
  } else {
    console.log(`\n(nada gravado — rode com --apply)`);
  }

  await client.end();
})().catch((e) => { console.error("Erro:", e.message); process.exit(1); });
