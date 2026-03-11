import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1. Buscar peças de teste (SKX007-SIM)
const { rows: pecas } = await client.query(`
  SELECT p.id, p.sku, p.modelo, p.status, p."valorCompra"
  FROM pecas p
  WHERE p.modelo LIKE '%SIM%'
  ORDER BY p.sku
`);

console.log(`\nPeças de teste encontradas: ${pecas.length}`);
for (const p of pecas) {
  console.log(`  ${p.sku} | ${p.modelo} | ${p.status} | R$${Number(p.valorCompra).toFixed(2)}`);
}

if (pecas.length === 0) {
  console.log("Nenhuma peça de teste para limpar.");
  await client.end();
  process.exit(0);
}

const pecaIds = pecas.map(p => p.id);

// 2. Buscar vendas dessas peças
const { rows: vendas } = await client.query(`
  SELECT id, "pecaId", "valorFinal", "statusPagamento"
  FROM vendas WHERE "pecaId" = ANY($1)
`, [pecaIds]);

console.log(`\nVendas encontradas: ${vendas.length}`);
for (const v of vendas) console.log(`  ${v.id.slice(-12)} | R$${Number(v.valorFinal).toFixed(2)} | ${v.statusPagamento}`);

const vendaIds = vendas.map(v => v.id);

// 3. Buscar lançamentos dessas vendas
let lancIds = [];
if (vendaIds.length > 0) {
  const { rows: lancs } = await client.query(`
    SELECT id, descricao FROM lancamentos WHERE "vendaId" = ANY($1)
  `, [vendaIds]);
  lancIds = lancs.map(l => l.id);
  console.log(`\nLançamentos encontrados: ${lancs.length}`);
  for (const l of lancs) console.log(`  ${l.id.slice(-12)} | ${l.descricao}`);
}

// 4. Deletar em ordem (dependências primeiro)
console.log("\n--- DELETANDO ---");

// Pagamentos das vendas
if (vendaIds.length > 0) {
  const r1 = await client.query(`DELETE FROM pagamentos WHERE "vendaId" = ANY($1)`, [vendaIds]);
  console.log(`Pagamentos deletados: ${r1.rowCount}`);
}

// Linhas de lançamento
if (lancIds.length > 0) {
  const r2 = await client.query(`DELETE FROM linhas_lancamento WHERE "lancamentoId" = ANY($1)`, [lancIds]);
  console.log(`Linhas de lançamento deletadas: ${r2.rowCount}`);
}

// Lançamentos
if (lancIds.length > 0) {
  const r3 = await client.query(`DELETE FROM lancamentos WHERE id = ANY($1)`, [lancIds]);
  console.log(`Lançamentos deletados: ${r3.rowCount}`);
}

// Vendas
if (vendaIds.length > 0) {
  const r4 = await client.query(`DELETE FROM vendas WHERE id = ANY($1)`, [vendaIds]);
  console.log(`Vendas deletadas: ${r4.rowCount}`);
}

// Peças
const r5 = await client.query(`DELETE FROM pecas WHERE id = ANY($1)`, [pecaIds]);
console.log(`Peças deletadas: ${r5.rowCount}`);

console.log("\n--- LIMPEZA CONCLUÍDA ---");

await client.end();
