import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString });

async function deleteAdmin() {
  await client.connect();
  console.log("Deletando admin existente...");

  await client.query(`DELETE FROM account WHERE "userId" IN (SELECT id FROM "user" WHERE email = 'admin@mrchrono.com')`);
  await client.query(`DELETE FROM session WHERE "userId" IN (SELECT id FROM "user" WHERE email = 'admin@mrchrono.com')`);
  await client.query(`DELETE FROM "user" WHERE email = 'admin@mrchrono.com'`);

  console.log("Admin deletado!");
  await client.end();
}

deleteAdmin().catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});
