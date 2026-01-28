import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega .env do apps/web
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não configurada no .env");
}

const client = new pg.Client({ connectionString });

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function seed() {
  await client.connect();
  console.log("🌱 Iniciando seed...");

  const adminId = "admin-mrchrono-001";
  const hashedPassword = await hashPassword("MrChrono@2026");
  const now = new Date().toISOString();

  // Inserir usuário admin
  await client.query(`
    INSERT INTO "user" (id, email, name, "emailVerified", nivel, ativo, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (email) DO NOTHING
  `, [adminId, "admin@mrchrono.com", "Administrador", true, "ADMINISTRADOR", true, now, now]);

  console.log("✅ Usuário admin criado: admin@mrchrono.com");

  // Inserir account com senha
  await client.query(`
    INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET password = $5
  `, ["account-admin-001", adminId, "credential", adminId, hashedPassword, now, now]);

  console.log("✅ Credenciais do admin configuradas");

  // Inserir configurações padrão
  const configuracoes = [
    ["taxa_mdr", "4"],
    ["lead_time_dias", "20"],
    ["meta_vendas_semana", "10"],
    ["localizacoes", "Rafael,Pedro,Heitor,Tampograth,Fornecedor,Cliente Final"],
    ["alerta_relojoeiro_dias", "14"],
  ];

  for (const [chave, valor] of configuracoes) {
    await client.query(`
      INSERT INTO configuracoes (id, chave, valor, "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3)
      ON CONFLICT (chave) DO UPDATE SET valor = $2, "updatedAt" = $3
    `, [chave, valor, now]);
  }

  console.log("✅ Configurações padrão criadas");
  console.log("");
  console.log("📋 Credenciais do Admin:");
  console.log("   Email: admin@mrchrono.com");
  console.log("   Senha: MrChrono@2026");
  console.log("");
  console.log("🎉 Seed completo!");

  await client.end();
}

seed().catch(e => {
  console.error("❌ Erro no seed:", e);
  process.exit(1);
});
