import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString });

async function updateSaldos() {
  await client.connect();
  console.log("Atualizando saldos iniciais das contas bancarias...");

  // Nubank PJ → -95938.38 (para que saldo final = 22743.83 após movimentações contábeis)
  const r1 = await client.query(
    `UPDATE contas_bancarias SET "saldoInicial" = -95938.38 WHERE nome = 'Nubank PJ'`
  );
  console.log(`  Nubank PJ: ${r1.rowCount} registro(s) atualizado(s) → saldoInicial = -95938.38`);

  // Todas as outras contas → 0
  const r2 = await client.query(
    `UPDATE contas_bancarias SET "saldoInicial" = 0 WHERE nome != 'Nubank PJ'`
  );
  console.log(`  Outras contas: ${r2.rowCount} registro(s) atualizado(s) → saldoInicial = 0`);

  console.log("Saldos atualizados!");
  await client.end();
}

updateSaldos().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
