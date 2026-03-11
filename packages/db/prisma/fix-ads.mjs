import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const lancamentoId = 'cmm2b9vbi000004l1hkdx6wze'; // precisamos encontrar o ID correto

// Buscar a linha do lançamento #161
const { rows: linhas } = await client.query(`
  SELECT ll.id, ll."lancamentoId", ll."contaDebitoId", ll."contaCreditoId", ll.valor,
         cd.codigo as deb_codigo, cc.codigo as cred_codigo
  FROM linhas_lancamento ll
  JOIN lancamentos l ON l.id = ll."lancamentoId"
  JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
  JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
  WHERE l.numero = 161
`);

if (linhas.length === 0) {
  console.log("Lançamento #161 não encontrado!");
  await client.end();
  process.exit(1);
}

const linha = linhas[0];
console.log("=== ANTES ===");
console.log(`Linha ID: ${linha.id}`);
console.log(`Débito: ${linha.deb_codigo} (id: ${linha.contaDebitoId})`);
console.log(`Crédito: ${linha.cred_codigo} (id: ${linha.contaCreditoId})`);
console.log(`Valor: R$ ${Number(linha.valor).toFixed(2)}`);

// Inverter: trocar contaDebitoId <-> contaCreditoId
const { rowCount } = await client.query(`
  UPDATE linhas_lancamento
  SET "contaDebitoId" = $1, "contaCreditoId" = $2
  WHERE id = $3
`, [linha.contaCreditoId, linha.contaDebitoId, linha.id]);

console.log(`\nLinhas atualizadas: ${rowCount}`);

// Verificar
const { rows: depois } = await client.query(`
  SELECT ll."contaDebitoId", ll."contaCreditoId",
         cd.codigo as deb_codigo, cc.codigo as cred_codigo
  FROM linhas_lancamento ll
  JOIN contas_contabeis cd ON cd.id = ll."contaDebitoId"
  JOIN contas_contabeis cc ON cc.id = ll."contaCreditoId"
  WHERE ll.id = $1
`, [linha.id]);

console.log("\n=== DEPOIS ===");
console.log(`Débito: ${depois[0].deb_codigo} (despesa Ads)`);
console.log(`Crédito: ${depois[0].cred_codigo} (banco PagBank)`);
console.log("Correção aplicada com sucesso!");

await client.end();
