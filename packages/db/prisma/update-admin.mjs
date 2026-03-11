import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString });

async function updateAdmin() {
  await client.connect();
  console.log("Atualizando admin para ADMINISTRADOR...");

  await client.query(`UPDATE "user" SET nivel = 'ADMINISTRADOR', "emailVerified" = true WHERE email = 'admin@mrchrono.com'`);

  console.log("Admin atualizado para ADMINISTRADOR!");
  await client.end();
}

updateAdmin().catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});
