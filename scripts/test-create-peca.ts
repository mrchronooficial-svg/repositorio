import prisma from "@gestaomrchrono/db";

async function main() {
  console.log("Iniciando teste de criacao de peca...\n");

  // 1. Verificar se existe usuario admin
  const admin = await prisma.user.findFirst({
    where: { nivel: "ADMINISTRADOR" },
  });

  if (!admin) {
    console.log("Erro: Usuario admin nao encontrado. Execute o seed primeiro.");
    return;
  }
  console.log(`Usuario admin encontrado: ${admin.name} (${admin.email})`);

  // 2. Verificar/criar fornecedor de teste
  let fornecedor = await prisma.fornecedor.findFirst({
    where: { nome: { contains: "Teste" } },
  });

  if (!fornecedor) {
    console.log("\nCriando fornecedor de teste...");
    fornecedor = await prisma.fornecedor.create({
      data: {
        tipo: "PESSOA_FISICA",
        nome: "Joao da Silva - Teste",
        cpfCnpj: "12345678901",
        telefone: "(11) 99999-9999",
        email: "joao.teste@email.com",
        cep: "01310-100",
        logradouro: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "Sao Paulo",
        estado: "SP",
        score: "BOM",
      },
    });
    console.log(`Fornecedor criado: ${fornecedor.nome} (ID: ${fornecedor.id})`);
  } else {
    console.log(`\nFornecedor encontrado: ${fornecedor.nome} (ID: ${fornecedor.id})`);
  }

  // 3. Gerar SKU
  const ultimaPeca = await prisma.peca.findFirst({
    orderBy: { sku: "desc" },
    select: { sku: true },
  });

  let proximoNumero = 1;
  if (ultimaPeca?.sku) {
    const match = ultimaPeca.sku.match(/MRC-(\d+)/);
    if (match) {
      proximoNumero = parseInt(match[1], 10) + 1;
    }
  }
  const sku = `MRC-${proximoNumero.toString().padStart(4, "0")}`;
  console.log(`\nSKU gerado: ${sku}`);

  // 4. Criar peca de teste
  console.log("\nCriando peca de teste...");
  const peca = await prisma.peca.create({
    data: {
      sku,
      skuBase: sku,
      marca: "Omega",
      modelo: "Seamaster 300",
      ano: 1968,
      tamanhoCaixa: 39,
      materialCaixa: "Aco Inoxidavel",
      materialPulseira: "Aco",
      valorCompra: 8500.00,
      valorEstimadoVenda: 15000.00,
      origemTipo: "COMPRA",
      origemCanal: "PESSOA_FISICA",
      localizacao: "Rafael",
      status: "EM_TRANSITO",
      fornecedorId: fornecedor.id,
      fotos: {
        create: [
          {
            url: "/uploads/teste-omega-1.jpg",
            ordem: 0,
          },
        ],
      },
      historicoStatus: {
        create: {
          statusNovo: "EM_TRANSITO",
          localizacaoNova: "Rafael",
          userId: admin.id,
        },
      },
    },
    include: {
      fotos: true,
      fornecedor: true,
    },
  });

  console.log("\n=== PECA CRIADA COM SUCESSO ===");
  console.log(`SKU: ${peca.sku}`);
  console.log(`Marca/Modelo: ${peca.marca} ${peca.modelo}`);
  console.log(`Ano: ${peca.ano}`);
  console.log(`Tamanho: ${peca.tamanhoCaixa}mm`);
  console.log(`Valor Compra: R$ ${peca.valorCompra.toFixed(2)}`);
  console.log(`Valor Estimado: R$ ${peca.valorEstimadoVenda.toFixed(2)}`);
  console.log(`Status: ${peca.status}`);
  console.log(`Localizacao: ${peca.localizacao}`);
  console.log(`Fornecedor: ${peca.fornecedor.nome}`);
  console.log(`Fotos: ${peca.fotos.length}`);
  console.log(`ID: ${peca.id}`);
  console.log("\nTeste concluido com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
