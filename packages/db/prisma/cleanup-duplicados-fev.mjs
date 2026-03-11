import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// IDs dos 5 lançamentos do batch 1 (14/02) a deletar
const idsToDelete = [
  'cmlmjqh32001yt4rvekv0w7lh', // #72 Contabilidade R$ 711
  'cmlmjqh500020t4rv6aup92b7', // #73 Dacto R$ 531
  'cmlmjqh6x0022t4rvvvpgl5vd', // #74 Minha Loja Conectada R$ 180
  'cmlmjqh8t0024t4rvdjcy72zv', // #75 Manychat R$ 249
  'cmlmjqhaq0026t4rvgoxtepzl', // #76 Poli Digital R$ 449.90
];

// Verificar antes de deletar
console.log("=== ANTES DA LIMPEZA ===");
const { rows: antes } = await client.query(`
  SELECT l.id, l.numero, l.descricao, COALESCE(SUM(ll.valor), 0) as valor
  FROM lancamentos l
  LEFT JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  WHERE l.id = ANY($1)
  GROUP BY l.id, l.numero, l.descricao
  ORDER BY l.numero
`, [idsToDelete]);

for (const r of antes) {
  console.log(`  #${r.numero} | ${r.descricao} | R$ ${Number(r.valor).toFixed(2)}`);
}
console.log(`Total: ${antes.length} lançamentos`);

// Deletar linhas primeiro (cascade deveria cuidar, mas por segurança)
const { rowCount: linhasDeleted } = await client.query(`
  DELETE FROM linhas_lancamento WHERE "lancamentoId" = ANY($1)
`, [idsToDelete]);
console.log(`\nLinhas deletadas: ${linhasDeleted}`);

// Deletar lançamentos
const { rowCount: lancamentosDeleted } = await client.query(`
  DELETE FROM lancamentos WHERE id = ANY($1)
`, [idsToDelete]);
console.log(`Lançamentos deletados: ${lancamentosDeleted}`);

// Verificar o que ficou
console.log("\n=== DEPOIS DA LIMPEZA — Despesas recorrentes FEV/2026 ===");
const { rows: depois } = await client.query(`
  SELECT l.numero, l.descricao, COALESCE(SUM(ll.valor), 0) as valor, l."createdAt"
  FROM lancamentos l
  LEFT JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  WHERE l.tipo = 'AUTOMATICO_DESPESA_RECORRENTE'
    AND l.data >= '2026-02-01' AND l.data < '2026-03-01'
  GROUP BY l.id, l.numero, l.descricao, l."createdAt"
  ORDER BY l.numero
`);

let total = 0;
for (const r of depois) {
  total += Number(r.valor);
  console.log(`  #${r.numero} | ${r.descricao} | R$ ${Number(r.valor).toFixed(2)}`);
}
console.log(`Total despesas recorrentes FEV: R$ ${total.toFixed(2)}`);

await client.end();
