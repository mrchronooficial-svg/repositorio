import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1. Buscar TODOS os lançamentos de despesa recorrente, agrupados por mês + despesaRecorrenteId
console.log("=== LANÇAMENTOS DE DESPESA RECORRENTE (por mês) ===\n");

const { rows: lancamentos } = await client.query(`
  SELECT l.id, l.numero, l.data, l.descricao, l.tipo, l."despesaRecorrenteId",
         l.estornado, l."estornoDeId", l."createdAt",
         EXTRACT(YEAR FROM l.data) as ano,
         EXTRACT(MONTH FROM l.data) as mes,
         SUM(ll.valor) as valor_total
  FROM lancamentos l
  LEFT JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  WHERE l.tipo = 'AUTOMATICO_DESPESA_RECORRENTE'
  GROUP BY l.id, l.numero, l.data, l.descricao, l.tipo, l."despesaRecorrenteId",
           l.estornado, l."estornoDeId", l."createdAt"
  ORDER BY l.data ASC, l."despesaRecorrenteId", l."createdAt" ASC
`);

// Agrupar por mês + despesaRecorrenteId
const grupos = {};
for (const l of lancamentos) {
  const key = `${l.ano}-${String(l.mes).padStart(2,'0')}|${l.despesaRecorrenteId}`;
  if (!grupos[key]) grupos[key] = [];
  grupos[key].push(l);
}

// Identificar duplicatas
const duplicatas = [];
let totalDuplicatas = 0;

for (const [key, items] of Object.entries(grupos)) {
  // Filtrar apenas os ativos (não estornados e não são estornos)
  const ativos = items.filter(i => !i.estornado && !i.estornoDeId);

  if (ativos.length > 1) {
    const [mes, despRecId] = key.split('|');
    console.log(`DUPLICATA encontrada: Mês ${mes} | DespRecId: ${despRecId}`);
    console.log(`  ${ativos.length} lançamentos ativos (deveria ser 1):`);
    for (const a of ativos) {
      console.log(`    #${a.numero} | ${a.data.toISOString().slice(0,10)} | ${a.descricao} | R$ ${Number(a.valor_total).toFixed(2)} | criado: ${a.createdAt.toISOString().slice(0,19)} | id: ${a.id}`);
    }
    // Marcar os mais recentes como duplicatas (manter o primeiro criado)
    for (let i = 1; i < ativos.length; i++) {
      duplicatas.push(ativos[i]);
    }
    totalDuplicatas += ativos.length - 1;
    console.log('');
  }
}

// Verificar também lançamentos estornados (que o usuário já excluiu/estornou)
const estornados = lancamentos.filter(l => l.estornado);
const estornos = lancamentos.filter(l => l.estornoDeId);

console.log("\n=== RESUMO ===");
console.log(`Total de lançamentos de despesa recorrente: ${lancamentos.length}`);
console.log(`  - Ativos (não estornados): ${lancamentos.filter(l => !l.estornado && !l.estornoDeId).length}`);
console.log(`  - Estornados: ${estornados.length}`);
console.log(`  - Estornos (reversos): ${estornos.length}`);
console.log(`  - DUPLICATAS detectadas: ${totalDuplicatas}`);

if (duplicatas.length > 0) {
  console.log("\n=== LANÇAMENTOS DUPLICADOS (a remover) ===");
  let valorTotal = 0;
  for (const d of duplicatas) {
    const val = Number(d.valor_total);
    valorTotal += val;
    console.log(`  #${d.numero} | ${d.data.toISOString().slice(0,10)} | ${d.descricao} | R$ ${val.toFixed(2)} | id: ${d.id}`);
  }
  console.log(`\nValor total das duplicatas: R$ ${valorTotal.toFixed(2)}`);
  console.log(`IDs para deletar: ${duplicatas.map(d => `'${d.id}'`).join(', ')}`);
}

// Mostrar também os que foram estornados (para referência)
if (estornados.length > 0) {
  console.log("\n=== LANÇAMENTOS JÁ ESTORNADOS (mantidos fora) ===");
  for (const e of estornados) {
    console.log(`  #${e.numero} | ${e.data.toISOString().slice(0,10)} | ${e.descricao} | R$ ${Number(e.valor_total).toFixed(2)} | id: ${e.id}`);
  }
}

await client.end();
