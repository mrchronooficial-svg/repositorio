import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1. Buscar lançamentos com "Ads" ou "ads" na descrição
console.log("=== LANÇAMENTOS COM 'ADS' ===\n");
const { rows: ads } = await client.query(`
  SELECT l.id, l.numero, l.data, l.descricao, l.tipo, l.recorrente,
         l.estornado, l."estornoDeId",
         ll.valor, ll.historico,
         cd.codigo as conta_debito, cd.nome as nome_debito, cd.natureza as nat_debito,
         cc.codigo as conta_credito, cc.nome as nome_credito, cc.natureza as nat_credito
  FROM lancamentos l
  JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
  JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
  WHERE LOWER(l.descricao) LIKE '%ads%' OR LOWER(l.descricao) LIKE '%market%' OR LOWER(l.descricao) LIKE '%tráfego%'
  ORDER BY l.data ASC
`);

for (const r of ads) {
  console.log(`#${r.numero} | ${r.data.toISOString().slice(0,10)} | ${r.descricao}`);
  console.log(`  Débito: ${r.conta_debito} (${r.nome_debito}) [${r.nat_debito}]`);
  console.log(`  Crédito: ${r.conta_credito} (${r.nome_credito}) [${r.nat_credito}]`);
  console.log(`  Valor: R$ ${Number(r.valor).toFixed(2)}`);
  console.log(`  Estornado: ${r.estornado} | EstornoDe: ${r.estornoDeId || '-'}`);
  console.log('');
}

// 2. Buscar contas 4.2.3 (Marketing/Ads) para ver a natureza
console.log("=== CONTAS DE MARKETING/ADS ===");
const { rows: contasAds } = await client.query(`
  SELECT codigo, nome, natureza, tipo FROM contas_contabeis
  WHERE codigo LIKE '4.2.3%' OR LOWER(nome) LIKE '%ads%' OR LOWER(nome) LIKE '%market%' OR LOWER(nome) LIKE '%tráfego%'
  ORDER BY codigo
`);
for (const c of contasAds) {
  console.log(`  ${c.codigo} | ${c.nome} | Natureza: ${c.natureza} | Tipo: ${c.tipo}`);
}

// 3. Buscar TODOS os lançamentos manuais/não-recorrentes de fev para ver se ads está entre eles
console.log("\n=== LANÇAMENTOS MANUAIS/NÃO-RECORRENTES FEV/2026 ===");
const { rows: manuais } = await client.query(`
  SELECT l.id, l.numero, l.descricao, l.tipo, l.recorrente,
         ll.valor,
         cd.codigo as conta_debito, cd.nome as nome_debito,
         cc.codigo as conta_credito, cc.nome as nome_credito
  FROM lancamentos l
  JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
  JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
  WHERE l.data >= '2026-02-01' AND l.data < '2026-03-01'
    AND l.tipo = 'MANUAL'
    AND l.estornado = false AND l."estornoDeId" IS NULL
  ORDER BY l.numero
`);
for (const r of manuais) {
  console.log(`  #${r.numero} | ${r.descricao} | R$ ${Number(r.valor).toFixed(2)} | D:${r.conta_debito} C:${r.conta_credito} | recorrente:${r.recorrente}`);
}

await client.end();
