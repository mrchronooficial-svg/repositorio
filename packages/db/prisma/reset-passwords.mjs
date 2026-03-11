import pg from "pg";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";

// Ler DATABASE_URL do .env
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../../apps/web/.env");
const envContent = readFileSync(envPath, "utf-8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error("DATABASE_URL nao encontrada no .env");
const connectionString = match[1];

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

// Replicar EXATAMENTE o hash do Better Auth (mesmo formato de password.mjs)
const config = { N: 16384, r: 16, p: 1, dkLen: 64 };

async function hashPassword(password) {
  const salt = bytesToHex(randomBytes(16));
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: config.N,
    r: config.r,
    p: config.p,
    dkLen: config.dkLen,
    maxmem: 128 * config.N * config.r * 2,
  });
  return `${salt}:${bytesToHex(key)}`;
}

async function resetPasswords() {
  await client.connect();
  console.log("Conectado ao banco.");

  // Buscar usuarios Drummond
  const result = await client.query(
    `SELECT u.id, u.name, u.email FROM "user" u WHERE u.name ILIKE '%drummond%' ORDER BY u.name`
  );

  if (result.rows.length === 0) {
    console.log("Nenhum usuario Drummond encontrado.");
    await client.end();
    return;
  }

  console.log(`Encontrados ${result.rows.length} usuarios:`);
  result.rows.forEach(u => console.log(`  - ${u.name} (${u.email})`));

  const newPassword = "Abcd@1234";
  const hashedPassword = await hashPassword(newPassword);

  for (const user of result.rows) {
    const updated = await client.query(
      `UPDATE account SET password = $1 WHERE "userId" = $2 AND "providerId" = 'credential'`,
      [hashedPassword, user.id]
    );
    console.log(`Senha atualizada para ${user.name}: ${updated.rowCount} account(s) afetada(s)`);
  }

  console.log("");
  console.log("Nova senha: Abcd@1234");
  console.log("Pronto!");

  await client.end();
}

resetPasswords().catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});
