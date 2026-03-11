import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Atualizar PagBank saldoInicial para 8700
await client.query(`UPDATE contas_bancarias SET "saldoInicial" = 8700 WHERE id = 'cmlcuzs5a001ilkrv4wuiefnm'`);
console.log("PagBank saldoInicial atualizado para 8700");

// Inserir SALDO_INICIAL_CAIXA na tabela configuracoes
await client.query(`
  INSERT INTO configuracoes (id, chave, valor, "updatedAt")
  VALUES (gen_random_uuid()::text, 'SALDO_INICIAL_CAIXA', '105690.65', NOW())
  ON CONFLICT (chave) DO UPDATE SET valor = '105690.65', "updatedAt" = NOW()
`);
console.log("Config SALDO_INICIAL_CAIXA = 105690.65");

// Verificar
const { rows: bancos } = await client.query(`SELECT cb."saldoInicial", cc.codigo, cc.nome FROM contas_bancarias cb JOIN contas_contabeis cc ON cc.id = cb."contaContabilId"`);
for (const b of bancos) console.log(b.codigo, b.nome, ":", Number(b.saldoInicial).toFixed(2));

const { rows: [cfg] } = await client.query(`SELECT * FROM configuracoes WHERE chave = 'SALDO_INICIAL_CAIXA'`);
console.log("Config SALDO_INICIAL_CAIXA:", cfg?.valor);

await client.end();
