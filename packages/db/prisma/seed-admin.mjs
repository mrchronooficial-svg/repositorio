import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não configurada");
}

const client = new pg.Client({ connectionString });

// Better Auth usa bcrypt - vamos importar
import bcrypt from "bcryptjs";

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function seed() {
  await client.connect();
  console.log("🌱 Criando usuário admin com Better Auth...");

  const adminId = "admin-mrchrono-001";
  const password = "MrChrono@2026";
  const hashedPassword = await hashPassword(password);
  const now = new Date().toISOString();

  // Deletar usuário existente se houver
  await client.query(`DELETE FROM account WHERE "userId" = $1`, [adminId]);
  await client.query(`DELETE FROM session WHERE "userId" = $1`, [adminId]);
  await client.query(`DELETE FROM "user" WHERE id = $1`, [adminId]);

  console.log("🗑️  Limpou dados antigos do admin");

  // Inserir usuário admin
  await client.query(`
    INSERT INTO "user" (id, email, name, "emailVerified", nivel, ativo, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [adminId, "admin@mrchrono.com", "Administrador", true, "ADMINISTRADOR", true, now, now]);

  console.log("✅ Usuário admin criado");

  // Inserir account com senha no formato Better Auth (bcrypt)
  const accountId = "account-admin-" + Date.now();
  await client.query(`
    INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [accountId, adminId, "credential", adminId, hashedPassword, now, now]);

  console.log("✅ Credenciais configuradas com bcrypt");
  console.log("");
  console.log("📋 Credenciais do Admin:");
  console.log("   Email: admin@mrchrono.com");
  console.log("   Senha: MrChrono@2026");
  console.log("");
  console.log("🎉 Admin criado com sucesso!");

  await client.end();
}

seed().catch(e => {
  console.error("❌ Erro:", e);
  process.exit(1);
});
