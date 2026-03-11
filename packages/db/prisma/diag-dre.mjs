import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1. Ver as contas contábeis de Kommo e Claude AI
console.log("=== CONTAS CONTÁBEIS 4.2.6.x ===");
const { rows: contas } = await client.query(`
  SELECT codigo, nome, natureza, tipo, "contaPaiId" FROM contas_contabeis
  WHERE codigo LIKE '4.2.6%' OR codigo LIKE '4.2%'
  ORDER BY codigo
`);
for (const c of contas) {
  console.log(`  ${c.codigo} | ${c.nome} | ${c.natureza} | ${c.tipo} | paiId: ${c.contaPaiId || '-'}`);
}

// 2. Lançamentos de Kommo e Claude no mês 02/2026
console.log("\n=== LANÇAMENTOS KOMMO E CLAUDE (FEV/2026) ===");
const { rows: lancs } = await client.query(`
  SELECT l.numero, l.descricao, ll.valor,
         cd.codigo as deb_codigo, cd.nome as deb_nome,
         cc.codigo as cred_codigo, cc.nome as cred_nome
  FROM lancamentos l
  JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
  JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
  WHERE l.data >= '2026-02-01' AND l.data < '2026-03-01'
    AND l.estornado = false AND l."estornoDeId" IS NULL
    AND (cd.codigo LIKE '4.2.6%')
  ORDER BY cd.codigo
`);
for (const l of lancs) {
  console.log(`  #${l.numero} | ${l.descricao} | R$ ${Number(l.valor).toFixed(2)} | D:${l.deb_codigo} (${l.deb_nome}) C:${l.cred_codigo}`);
}

// 3. Ver TODOS os lançamentos de despesa na DRE de fev (contas 4.x)
console.log("\n=== TODOS OS LANÇAMENTOS EM CONTAS 4.x (FEV/2026) ===");
const { rows: todos } = await client.query(`
  SELECT cd.codigo as deb_codigo, cd.nome as deb_nome, SUM(ll.valor) as total
  FROM lancamentos l
  JOIN linhas_lancamento ll ON ll."lancamentoId" = l.id
  JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
  WHERE l.data >= '2026-02-01' AND l.data < '2026-03-01'
    AND l.estornado = false AND l."estornoDeId" IS NULL
    AND cd.codigo LIKE '4%'
  GROUP BY cd.codigo, cd.nome
  ORDER BY cd.codigo
`);
for (const t of todos) {
  console.log(`  ${t.deb_codigo} | ${t.deb_nome} | R$ ${Number(t.total).toFixed(2)}`);
}

await client.end();
