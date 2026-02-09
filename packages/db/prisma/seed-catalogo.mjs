// Seed das configuracoes de urgencia do Catalogo Publico
// Executar com: node packages/db/prisma/seed-catalogo.mjs

import dotenv from "dotenv";
dotenv.config({ path: "../../apps/web/.env" });

import { PrismaClient } from "./generated/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const configsCatalogo = [
  // Header — viewers globais
  { chave: "catalogo_urgencia_header_viewers_min", valor: "15" },
  { chave: "catalogo_urgencia_header_viewers_max", valor: "45" },
  // Viewers por peca (3 faixas de preco: baixo < 5000, medio 5000-15000, alto > 15000)
  { chave: "catalogo_urgencia_viewers_min_baixo", valor: "10" },
  { chave: "catalogo_urgencia_viewers_max_baixo", valor: "20" },
  { chave: "catalogo_urgencia_viewers_min_medio", valor: "15" },
  { chave: "catalogo_urgencia_viewers_max_medio", valor: "30" },
  { chave: "catalogo_urgencia_viewers_min_alto", valor: "25" },
  { chave: "catalogo_urgencia_viewers_max_alto", valor: "45" },
  // Vendidos nos ultimos 7 dias por peca
  { chave: "catalogo_urgencia_vendidos_min_baixo", valor: "4" },
  { chave: "catalogo_urgencia_vendidos_max_baixo", valor: "8" },
  { chave: "catalogo_urgencia_vendidos_min_medio", valor: "2" },
  { chave: "catalogo_urgencia_vendidos_max_medio", valor: "5" },
  { chave: "catalogo_urgencia_vendidos_min_alto", valor: "1" },
  { chave: "catalogo_urgencia_vendidos_max_alto", valor: "3" },
  // Interacoes por peca
  { chave: "catalogo_urgencia_interacoes_min_baixo", valor: "15" },
  { chave: "catalogo_urgencia_interacoes_max_baixo", valor: "30" },
  { chave: "catalogo_urgencia_interacoes_min_medio", valor: "20" },
  { chave: "catalogo_urgencia_interacoes_max_medio", valor: "40" },
  { chave: "catalogo_urgencia_interacoes_min_alto", valor: "30" },
  { chave: "catalogo_urgencia_interacoes_max_alto", valor: "60" },
];

async function main() {
  console.log("Iniciando seed das configuracoes do catalogo...\n");

  let created = 0;
  let updated = 0;

  for (const config of configsCatalogo) {
    const existing = await prisma.configuracao.findUnique({
      where: { chave: config.chave },
    });

    if (existing) {
      await prisma.configuracao.update({
        where: { chave: config.chave },
        data: { valor: config.valor },
      });
      updated++;
      console.log(`  ~ ${config.chave} = ${config.valor} (atualizado)`);
    } else {
      await prisma.configuracao.create({
        data: config,
      });
      created++;
      console.log(`  + ${config.chave} = ${config.valor} (criado)`);
    }
  }

  console.log(`\n${created} configs criadas, ${updated} atualizadas.`);
  console.log(`Total: ${configsCatalogo.length} configuracoes do catalogo.`);
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
