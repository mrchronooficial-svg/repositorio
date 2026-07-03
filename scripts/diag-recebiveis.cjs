// Diagnostico: verifica consistencia entre statusPagamento e saldo devedor real de cada venda.
// Le DATABASE_URL de apps/web/.env
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "apps", "web", ".env") });

const { Client } = require("pg");

const r2 = (n) => Math.round(n * 100) / 100;

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL nao encontrado em apps/web/.env");
    process.exit(1);
  }
  console.log("Conectando em:", url.replace(/\/\/[^@]+@/, "//***@"));

  const client = new Client({ connectionString: url });
  await client.connect();

  // Buscar todas as vendas nao canceladas com peca e cliente
  const vendas = await client.query(`
    SELECT v.id, v."valorFinal", v."statusPagamento", v."dataVenda",
           p.sku, p.marca, p.modelo, c.nome AS cliente
    FROM vendas v
    JOIN pecas p ON p.id = v."pecaId"
    JOIN clientes c ON c.id = v."clienteId"
    WHERE v.cancelada = false
    ORDER BY v."dataVenda" DESC
  `);

  // Pagamentos por venda
  const pagRes = await client.query(`
    SELECT "vendaId", COALESCE(SUM(valor),0) AS total, COUNT(*)::int AS n
    FROM pagamentos GROUP BY "vendaId"
  `);
  const pagMap = new Map();
  for (const row of pagRes.rows) {
    pagMap.set(row.vendaId, { total: Number(row.total), n: row.n });
  }

  const inconsistentes = []; // status PAGO mas ainda deve  (BUG 1: some do receber mas nao aparece)
  const deveriaSerPago = [];  // status PARCIAL/NAO_PAGO mas saldo <= 0.005 (fantasma / centavos) BUG 2
  const centavos = [];        // 0 < saldo < 0.02 (bloqueio de quitacao)
  let totalReceberReal = 0;   // soma de saldos realmente devidos (saldo > 0.005)
  let totalReceberSistema = 0; // o que o sistema conta hoje (status in NAO_PAGO/PARCIAL)

  for (const v of vendas.rows) {
    const valorFinal = Number(v.valorFinal);
    const pago = pagMap.get(v.id)?.total || 0;
    const saldoRaw = valorFinal - pago;
    const saldo = r2(saldoRaw);
    const status = v.statusPagamento;
    const label = `${v.sku} | ${v.marca} ${v.modelo} | ${v.cliente} | final=${valorFinal.toFixed(2)} pago=${pago.toFixed(2)} saldo=${saldoRaw.toFixed(6)} status=${status}`;

    // O que o sistema conta hoje como recebivel:
    if (status === "NAO_PAGO" || status === "PARCIAL") {
      totalReceberSistema += saldoRaw;
    }
    // O que realmente deveria ser recebivel:
    if (saldo > 0.005) totalReceberReal += saldo;

    // BUG 1: tem saldo real mas status esta PAGO -> nao entra em recebiveis
    if (status === "PAGO" && saldo > 0.005) {
      inconsistentes.push(label);
    }
    // Status diz que deve mas saldo <= 0 (ja quitado de fato, status travado)
    if ((status === "NAO_PAGO" || status === "PARCIAL") && saldo <= 0.005) {
      deveriaSerPago.push(label);
    }
    // BUG 2: saldo de centavos que trava a quitacao
    if (saldo > 0.005 && saldo < 0.02) {
      centavos.push(label);
    }
  }

  console.log(`\n=== TOTAIS ===`);
  console.log(`Vendas nao canceladas: ${vendas.rows.length}`);
  console.log(`Total a receber (sistema, por status): R$ ${r2(totalReceberSistema).toFixed(2)}`);
  console.log(`Total a receber (real, por saldo):     R$ ${totalReceberReal.toFixed(2)}`);
  console.log(`Diferenca: R$ ${r2(totalReceberReal - totalReceberSistema).toFixed(2)}`);

  console.log(`\n=== BUG 1: status PAGO mas ainda ha saldo devedor (NAO aparece em a receber) [${inconsistentes.length}] ===`);
  inconsistentes.forEach((l) => console.log("  " + l));

  console.log(`\n=== Status diz PARCIAL/NAO_PAGO mas saldo <= 0 (deveria ser PAGO) [${deveriaSerPago.length}] ===`);
  deveriaSerPago.forEach((l) => console.log("  " + l));

  console.log(`\n=== BUG 2: saldo entre 0.005 e 0.02 (centavos que travam quitacao) [${centavos.length}] ===`);
  centavos.forEach((l) => console.log("  " + l));

  // Rolex especifico
  console.log(`\n=== Vendas de ROLEX (nao canceladas) ===`);
  for (const v of vendas.rows) {
    if (String(v.marca).toLowerCase().includes("rolex")) {
      const valorFinal = Number(v.valorFinal);
      const pago = pagMap.get(v.id)?.total || 0;
      console.log(`  ${v.sku} | ${v.modelo} | ${v.cliente} | final=${valorFinal.toFixed(2)} pago=${pago.toFixed(2)} saldo=${(valorFinal-pago).toFixed(2)} status=${v.statusPagamento} data=${new Date(v.dataVenda).toISOString()}`);
    }
  }

  await client.end();
})().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
