import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Todas as contas do grupo 4 (custos e despesas)
console.log("=== ÁRVORE COMPLETA — GRUPO 4 ===");
const { rows } = await client.query(`
  SELECT codigo, nome, natureza, tipo, "contaPaiId"
  FROM contas_contabeis
  WHERE codigo LIKE '4%'
  ORDER BY codigo
`);
for (const c of rows) {
  const indent = (c.codigo.split('.').length - 1) * 2;
  const prefix = c.tipo === 'ANALITICA' ? '  📄' : '📁';
  console.log(`${' '.repeat(indent)}${prefix} ${c.codigo} | ${c.nome} | ${c.tipo}`);
}

console.log("\n=== ÁRVORE COMPLETA — GRUPO 3 ===");
const { rows: g3 } = await client.query(`
  SELECT codigo, nome, natureza, tipo
  FROM contas_contabeis
  WHERE codigo LIKE '3%'
  ORDER BY codigo
`);
for (const c of g3) {
  const indent = (c.codigo.split('.').length - 1) * 2;
  const prefix = c.tipo === 'ANALITICA' ? '  📄' : '📁';
  console.log(`${' '.repeat(indent)}${prefix} ${c.codigo} | ${c.nome} | ${c.tipo}`);
}

await client.end();
