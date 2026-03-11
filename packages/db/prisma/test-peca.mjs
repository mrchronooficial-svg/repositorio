import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega .env do apps/web
dotenv.config({ path: path.resolve(__dirname, "../../../apps/web/.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não configurada no .env");
}

const client = new pg.Client({ connectionString });

async function createTestPeca() {
  await client.connect();
  console.log("🧪 Iniciando teste de criação de peça...\n");

  // 1. Buscar admin
  const adminResult = await client.query(`SELECT id, name, email FROM "user" WHERE nivel = 'ADMINISTRADOR' LIMIT 1`);
  if (adminResult.rows.length === 0) {
    console.log("❌ Usuário admin não encontrado. Execute o seed primeiro.");
    await client.end();
    return;
  }
  const admin = adminResult.rows[0];
  console.log(`✅ Admin encontrado: ${admin.name} (${admin.email})`);

  // 2. Criar fornecedor de teste
  const fornecedorId = randomUUID();
  const now = new Date().toISOString();

  await client.query(`
    INSERT INTO fornecedores (id, tipo, nome, "cpfCnpj", telefone, email, cep, rua, numero, bairro, cidade, estado, score, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT ("cpfCnpj") DO UPDATE SET nome = $3
    RETURNING id
  `, [
    fornecedorId,
    "PESSOA_FISICA",
    "Carlos Relojoeiro - Teste",
    "98765432100",
    "(11) 98765-4321",
    "carlos.teste@email.com",
    "04538-132",
    "Rua Funchal",
    "500",
    "Vila Olimpia",
    "Sao Paulo",
    "SP",
    "EXCELENTE",
    now,
    now
  ]);
  console.log(`✅ Fornecedor criado: Carlos Relojoeiro - Teste`);

  // 3. Buscar último SKU
  const skuResult = await client.query(`SELECT sku FROM pecas ORDER BY sku DESC LIMIT 1`);
  let proximoNumero = 1;
  if (skuResult.rows.length > 0) {
    const match = skuResult.rows[0].sku.match(/MRC-(\d+)/);
    if (match) {
      proximoNumero = parseInt(match[1], 10) + 1;
    }
  }
  const sku = `MRC-${proximoNumero.toString().padStart(4, "0")}`;
  console.log(`✅ SKU gerado: ${sku}`);

  // 4. Criar peça
  const pecaId = randomUUID();
  await client.query(`
    INSERT INTO pecas (
      id, sku, "skuBase", marca, modelo, ano, "tamanhoCaixa", "materialCaixa", "materialPulseira",
      "valorCompra", "valorEstimadoVenda", "origemTipo", "origemCanal", localizacao, status,
      "fornecedorId", arquivado, "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
  `, [
    pecaId,
    sku,
    sku,
    "Omega",
    "Seamaster 300",
    1968,
    39,
    "Aco Inoxidavel",
    "Aco",
    8500.00,
    15000.00,
    "COMPRA",
    "PESSOA_FISICA",
    "Rafael",
    "EM_TRANSITO",
    fornecedorId,
    false,
    now,
    now
  ]);
  console.log(`✅ Peça criada: ${sku} - Omega Seamaster 300`);

  // 5. Criar foto
  await client.query(`
    INSERT INTO fotos (id, url, ordem, "pecaId", "createdAt")
    VALUES ($1, $2, $3, $4, $5)
  `, [randomUUID(), "/uploads/teste-omega-seamaster.jpg", 0, pecaId, now]);
  console.log(`✅ Foto adicionada`);

  // 6. Criar histórico
  await client.query(`
    INSERT INTO historico_status (id, "statusNovo", "localizacaoNova", "pecaId", "userId", "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [randomUUID(), "EM_TRANSITO", "Rafael", pecaId, admin.id, now]);
  console.log(`✅ Histórico registrado`);

  console.log("\n========================================");
  console.log("🎉 PEÇA CRIADA COM SUCESSO!");
  console.log("========================================");
  console.log(`📋 SKU: ${sku}`);
  console.log(`⌚ Marca/Modelo: Omega Seamaster 300`);
  console.log(`📅 Ano: 1968`);
  console.log(`📏 Tamanho: 39mm`);
  console.log(`💰 Valor Compra: R$ 8.500,00`);
  console.log(`💵 Valor Estimado: R$ 15.000,00`);
  console.log(`📍 Status: EM_TRANSITO`);
  console.log(`📌 Localização: Rafael`);
  console.log("========================================\n");

  console.log("Acesse o sistema para verificar a peça cadastrada!");

  await client.end();
}

createTestPeca().catch(e => {
  console.error("❌ Erro:", e);
  process.exit(1);
});
