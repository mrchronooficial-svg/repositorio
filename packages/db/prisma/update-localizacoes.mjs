import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const res = await client.query(
  `UPDATE configuracoes SET valor = $1 WHERE chave = 'localizacoes' RETURNING valor`,
  ['Rafael,Pedro,Heitor,Tampograth,Horloge Brasil,UTI dos Relógios,Fornecedor,Cliente Final']
);

console.log('Atualizado:', res.rows[0]?.valor);
await client.end();
