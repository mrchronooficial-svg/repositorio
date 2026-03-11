import pg from "pg";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../../apps/web/.env");
const envContent = readFileSync(envPath, "utf-8");
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) throw new Error("DATABASE_URL nao encontrada no .env");

const client = new pg.Client({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

const config = { N: 16384, r: 16, p: 1, dkLen: 64 };

async function hashPassword(password) {
  const salt = bytesToHex(randomBytes(16));
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: config.N, r: config.r, p: config.p, dkLen: config.dkLen,
    maxmem: 128 * config.N * config.r * 2,
  });
  return `${salt}:${bytesToHex(key)}`;
}

async function run() {
  await client.connect();
  console.log("Conectado ao banco.");

  const hashed = await hashPassword("MrChrono@2026");

  const res = await client.query(
    `UPDATE account SET password = $1 WHERE "userId" IN (SELECT id FROM "user" WHERE email = 'admin@mrchrono.com') AND "providerId" = 'credential'`,
    [hashed]
  );
  console.log("Admin password updated:", res.rowCount, "row(s)");

  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
