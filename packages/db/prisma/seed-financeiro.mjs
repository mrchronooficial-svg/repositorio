// Seed do Plano de Contas e Contas Bancarias do Modulo Financeiro
// Executar com: node packages/db/prisma/seed-financeiro.mjs

import dotenv from "dotenv";
dotenv.config({ path: "../../apps/web/.env" });

import { PrismaClient } from "./generated/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Plano de Contas completo (padrao CPC/CFC)
const CONTAS = [
  // ======= GRUPO 1 — ATIVO =======
  { codigo: "1", nome: "ATIVO", tipo: "GRUPO", natureza: "DEVEDORA", pai: null },
  { codigo: "1.1", nome: "Ativo Circulante", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "1" },
  { codigo: "1.1.1", nome: "Caixa e Equivalentes de Caixa", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "1.1" },
  { codigo: "1.1.1.01", nome: "Nubank (Pix)", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "1.1.1" },
  { codigo: "1.1.1.02", nome: "PagBank (Cartao)", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "1.1.1" },
  { codigo: "1.1.2", nome: "Contas a Receber", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "1.1" },
  { codigo: "1.1.2.01", nome: "Clientes - Vendas a Prazo", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "1.1.2" },
  { codigo: "1.1.3", nome: "Estoques", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "1.1" },
  { codigo: "1.1.3.01", nome: "Pecas (Relogios) - Estoque Proprio", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "1.1.3" },
  { codigo: "1.1.3.02", nome: "Material de Embalagem", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "1.1.3" },
  { codigo: "1.2", nome: "Ativo Nao Circulante", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "1" },
  { codigo: "1.2.1", nome: "Imobilizado", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "1.2" },

  // ======= GRUPO 2 — PASSIVO E PL =======
  { codigo: "2", nome: "PASSIVO", tipo: "GRUPO", natureza: "CREDORA", pai: null },
  { codigo: "2.1", nome: "Passivo Circulante", tipo: "SUBGRUPO", natureza: "CREDORA", pai: "2" },
  { codigo: "2.1.1", nome: "Fornecedores", tipo: "SUBGRUPO", natureza: "CREDORA", pai: "2.1" },
  { codigo: "2.1.1.01", nome: "Repasse - Consignacao", tipo: "ANALITICA", natureza: "CREDORA", pai: "2.1.1" },
  { codigo: "2.1.2", nome: "Obrigacoes Fiscais", tipo: "SUBGRUPO", natureza: "CREDORA", pai: "2.1" },
  { codigo: "2.1.2.01", nome: "Simples Nacional a Recolher", tipo: "ANALITICA", natureza: "CREDORA", pai: "2.1.2" },
  { codigo: "2.1.3", nome: "Outras Obrigacoes", tipo: "ANALITICA", natureza: "CREDORA", pai: "2.1" },
  { codigo: "2.2", nome: "Passivo Nao Circulante", tipo: "SUBGRUPO", natureza: "CREDORA", pai: "2" },
  { codigo: "2.3", nome: "Patrimonio Liquido", tipo: "SUBGRUPO", natureza: "CREDORA", pai: "2" },
  { codigo: "2.3.1", nome: "Capital Social", tipo: "ANALITICA", natureza: "CREDORA", pai: "2.3" },
  { codigo: "2.3.2", nome: "Lucros Acumulados", tipo: "ANALITICA", natureza: "CREDORA", pai: "2.3" },
  { codigo: "2.3.3", nome: "Distribuicao de Lucros (redutora)", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "2.3" },

  // ======= GRUPO 3 — RECEITAS =======
  { codigo: "3", nome: "RECEITAS", tipo: "GRUPO", natureza: "CREDORA", pai: null },
  { codigo: "3.1", nome: "Receita Bruta de Vendas", tipo: "SUBGRUPO", natureza: "CREDORA", pai: "3" },
  { codigo: "3.1.1", nome: "Venda de Pecas - Estoque Proprio", tipo: "ANALITICA", natureza: "CREDORA", pai: "3.1" },
  { codigo: "3.1.2", nome: "Venda de Pecas - Consignacao (margem)", tipo: "ANALITICA", natureza: "CREDORA", pai: "3.1" },
  { codigo: "3.2", nome: "(-) Deducoes da Receita", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "3" },
  { codigo: "3.2.1", nome: "(-) MDR - Taxa de Cartao", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "3.2" },
  { codigo: "3.2.2", nome: "(-) Simples Nacional", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "3.2" },

  // ======= GRUPO 4 — CUSTOS E DESPESAS =======
  { codigo: "4", nome: "CUSTOS E DESPESAS", tipo: "GRUPO", natureza: "DEVEDORA", pai: null },
  { codigo: "4.1", nome: "Custo das Mercadorias Vendidas (CMV)", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "4" },
  { codigo: "4.1.1", nome: "Custo de Aquisicao - Leilao", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.1" },
  { codigo: "4.1.2", nome: "Custo de Aquisicao - eBay", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.1" },
  { codigo: "4.1.3", nome: "Custo de Aquisicao - Pessoa Fisica", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.1" },
  { codigo: "4.1.4", nome: "Manutencao e Restauro", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.1" },
  { codigo: "4.2", nome: "Despesas Operacionais", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "4" },
  { codigo: "4.2.1", nome: "Marketing e Publicidade (Ads)", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2" },
  { codigo: "4.2.2", nome: "Frete de Envio ao Cliente", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2" },
  { codigo: "4.2.3", nome: "Editor de Video", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2" },
  { codigo: "4.2.4", nome: "Contabilidade", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2" },
  { codigo: "4.2.5", nome: "Dacto", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2" },
  { codigo: "4.2.6", nome: "Ferramentas e Sistemas", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "4.2" },
  { codigo: "4.2.6.01", nome: "Manychat", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2.6" },
  { codigo: "4.2.6.02", nome: "Poli Digital", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2.6" },
  { codigo: "4.2.6.03", nome: "Minha Loja Conectada", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2.6" },
  { codigo: "4.2.7", nome: "Materiais Diversos", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2" },
  { codigo: "4.2.8", nome: "Outras Despesas Recorrentes", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.2" },
  { codigo: "4.3", nome: "Despesas Financeiras", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "4" },
  { codigo: "4.3.1", nome: "Taxa de Antecipacao de Recebiveis", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.3" },
  { codigo: "4.4", nome: "Despesas Nao Recorrentes (One-offs)", tipo: "SUBGRUPO", natureza: "DEVEDORA", pai: "4" },
  { codigo: "4.4.1", nome: "Itens Nao Recorrentes", tipo: "ANALITICA", natureza: "DEVEDORA", pai: "4.4" },
];

async function main() {
  console.log("Iniciando seed do modulo financeiro...\n");

  // Verificar se ja existem contas
  const count = await prisma.contaContabil.count();
  if (count > 0) {
    console.log(`Ja existem ${count} contas contabeis no banco. Pulando seed do plano de contas.`);
  } else {
    // Criar contas em ordem (pais primeiro)
    const contaMap = new Map();

    for (let i = 0; i < CONTAS.length; i++) {
      const c = CONTAS[i];
      const contaPaiId = c.pai ? contaMap.get(c.pai) : null;

      const conta = await prisma.contaContabil.create({
        data: {
          codigo: c.codigo,
          nome: c.nome,
          tipo: c.tipo,
          natureza: c.natureza,
          contaPaiId: contaPaiId || null,
          ordem: i,
          sistematica: true,
        },
      });

      contaMap.set(c.codigo, conta.id);
      console.log(`  ✓ ${c.codigo} — ${c.nome}`);
    }

    console.log(`\n✓ ${CONTAS.length} contas contabeis criadas.\n`);

    // Criar contas bancarias
    const nubankContaId = contaMap.get("1.1.1.01");
    const pagbankContaId = contaMap.get("1.1.1.02");

    if (nubankContaId) {
      await prisma.contaBancaria.create({
        data: {
          nome: "Nubank PJ",
          banco: "Nubank",
          contaContabilId: nubankContaId,
          saldoInicial: 0,
        },
      });
      console.log("  ✓ Conta bancaria: Nubank PJ");
    }

    if (pagbankContaId) {
      await prisma.contaBancaria.create({
        data: {
          nome: "PagBank PJ",
          banco: "PagBank",
          contaContabilId: pagbankContaId,
          saldoInicial: 0,
        },
      });
      console.log("  ✓ Conta bancaria: PagBank PJ");
    }

    console.log("\n✓ 2 contas bancarias criadas.");
  }

  // Criar despesas recorrentes (se nao existirem)
  const despCount = await prisma.despesaRecorrente.count();
  if (despCount === 0) {
    const contaMap2 = new Map();
    const allContas = await prisma.contaContabil.findMany({ select: { id: true, codigo: true } });
    for (const c of allContas) {
      contaMap2.set(c.codigo, c.id);
    }

    const despesas = [
      { nome: "Contabilidade", valor: 711, codigo: "4.2.4" },
      { nome: "Dacto", valor: 531, codigo: "4.2.5" },
      { nome: "Minha Loja Conectada", valor: 180, codigo: "4.2.6.03" },
      { nome: "Manychat", valor: 249, codigo: "4.2.6.01" },
      { nome: "Poli Digital", valor: 449.9, codigo: "4.2.6.02" },
    ];

    for (const d of despesas) {
      const contaId = contaMap2.get(d.codigo);
      if (contaId) {
        await prisma.despesaRecorrente.create({
          data: {
            nome: d.nome,
            valor: d.valor,
            contaContabilId: contaId,
            status: "ATIVA",
            diaReconhecimento: 31,
          },
        });
        console.log(`  ✓ Despesa recorrente: ${d.nome} — R$ ${d.valor.toFixed(2)}`);
      }
    }
    console.log(`\n✓ ${despesas.length} despesas recorrentes criadas.`);
  } else {
    console.log(`Ja existem ${despCount} despesas recorrentes. Pulando.`);
  }

  console.log("\n✓ Seed do modulo financeiro concluido!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
