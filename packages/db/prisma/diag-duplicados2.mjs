import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Verificar TODOS os lançamentos de fevereiro/2026 para ter visão completa
console.log("=== TODOS OS LANÇAMENTOS DE FEV/2026 ===\n");

const { rows } = await client.query(`
  SELECT l.id, l.numero, l.data, l.descricao, l.tipo, l.recorrente,
         l.estornado, l."estornoDeId", l."despesaRecorrenteId", l."vendaId",
         l."createdAt",
         COALESCE(SUM(ll.valor), 0) as valor_total,
         cd.codigo as conta_debito,
         cc.codigo as conta_credito
  FROM lancamentos l
  LEFT JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  LEFT JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
  LEFT JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
  WHERE l.data >= '2026-02-01' AND l.data < '2026-03-01'
    AND l.tipo = 'AUTOMATICO_DESPESA_RECORRENTE'
  GROUP BY l.id, l.numero, l.data, l.descricao, l.tipo, l.recorrente,
           l.estornado, l."estornoDeId", l."despesaRecorrenteId", l."vendaId",
           l."createdAt", cd.codigo, cc.codigo
  ORDER BY l."createdAt" ASC
`);

for (const r of rows) {
  const flags = [];
  if (r.estornado) flags.push("ESTORNADO");
  if (r.estornoDeId) flags.push("ESTORNO-DE:" + r.estornoDeId.substring(0,8));
  console.log(`#${r.numero} | ${r.descricao} | R$ ${Number(r.valor_total).toFixed(2)} | D:${r.conta_debito} C:${r.conta_credito} | criado: ${r.createdAt.toISOString().slice(0,19)} ${flags.length ? '| ' + flags.join(' ') : ''}`);
}

// Verificar também se existem despesas recorrentes inativas (que o user desativou)
console.log("\n=== DESPESAS RECORRENTES (status) ===");
const { rows: despesas } = await client.query(`
  SELECT id, nome, valor, status FROM despesas_recorrentes ORDER BY nome
`);
for (const d of despesas) {
  console.log(`  ${d.nome} | R$ ${Number(d.valor).toFixed(2)} | Status: ${d.status} | id: ${d.id}`);
}

// Verificar se os 3 lançamentos que identifiquei como "mais recentes" (criados em 25/02)
// foram de despesas que deveriam existir ou não
console.log("\n=== ANÁLISE: lançamentos criados em 25/02 (segundo batch) ===");
const { rows: batch2 } = await client.query(`
  SELECT l.id, l.numero, l.descricao, l."despesaRecorrenteId", dr.nome as despesa_nome, dr.status as despesa_status
  FROM lancamentos l
  LEFT JOIN despesas_recorrentes dr ON dr.id = l."despesaRecorrenteId"
  WHERE l.tipo = 'AUTOMATICO_DESPESA_RECORRENTE'
    AND l.data >= '2026-02-01' AND l.data < '2026-03-01'
    AND l."createdAt" >= '2026-02-25'
  ORDER BY l.numero
`);
for (const b of batch2) {
  console.log(`  #${b.numero} | ${b.descricao} | Despesa: ${b.despesa_nome} (${b.despesa_status}) | id: ${b.id}`);
}

console.log("\n=== ANÁLISE: lançamentos criados em 14/02 (primeiro batch) ===");
const { rows: batch1 } = await client.query(`
  SELECT l.id, l.numero, l.descricao, l."despesaRecorrenteId", dr.nome as despesa_nome, dr.status as despesa_status
  FROM lancamentos l
  LEFT JOIN despesas_recorrentes dr ON dr.id = l."despesaRecorrenteId"
  WHERE l.tipo = 'AUTOMATICO_DESPESA_RECORRENTE'
    AND l.data >= '2026-02-01' AND l.data < '2026-03-01'
    AND l."createdAt" < '2026-02-25'
  ORDER BY l.numero
`);
for (const b of batch1) {
  console.log(`  #${b.numero} | ${b.descricao} | Despesa: ${b.despesa_nome} (${b.despesa_status}) | id: ${b.id}`);
}

await client.end();
