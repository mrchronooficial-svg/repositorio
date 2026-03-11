import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: "../../apps/web/.env" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// 1. Buscar IDs das contas de receita
const { rows: contas } = await client.query(`
  SELECT id, codigo FROM contas_contabeis WHERE codigo IN ('3.1.1', '3.1.2')
`);
const conta311 = contas.find(c => c.codigo === '3.1.1');
const conta312 = contas.find(c => c.codigo === '3.1.2');

// 2. Buscar todas as vendas não-canceladas com seus dados
const { rows: vendas } = await client.query(`
  SELECT v.id, v."valorFinal", v."valorRepasseDevido", v."formaPagamento", v."taxaMDR",
         p.sku, p."origemTipo"
  FROM vendas v
  JOIN pecas p ON p.id = v."pecaId"
  WHERE v.cancelada = false
  ORDER BY v."dataVenda" ASC
`);

console.log("=== Verificando lançamentos de receita ===");
let divergentes = [];

for (const v of vendas) {
  const isConsig = v.origemTipo === "CONSIGNACAO";
  const contaReceitaId = isConsig ? conta312.id : conta311.id;
  const valorFinal = parseFloat(v.valorFinal);
  const repasse = v.valorRepasseDevido ? parseFloat(v.valorRepasseDevido) : 0;
  const valorEsperado = isConsig && repasse > 0 ? valorFinal - repasse : valorFinal;

  // Buscar lançamento de receita não-estornado
  const { rows: linhas } = await client.query(`
    SELECT ll.valor
    FROM linhas_lancamento ll
    JOIN lancamentos l ON l.id = ll."lancamentoId"
    WHERE l."vendaId" = $1
      AND l.tipo = 'AUTOMATICO_VENDA'
      AND l.estornado = false
      AND ll."contaCreditoId" = $2
  `, [v.id, contaReceitaId]);

  if (linhas.length === 0) {
    console.log(v.sku.padEnd(14), "SEM LANCAMENTO RECEITA");
    continue;
  }

  const valorAtual = parseFloat(linhas[0].valor);
  if (Math.abs(valorAtual - valorEsperado) > 0.01) {
    console.log(v.sku.padEnd(14), `DIVERGENTE: atual=${valorAtual.toFixed(2)} esperado=${valorEsperado.toFixed(2)}`);
    divergentes.push({ ...v, valorAtual, valorEsperado });
  } else {
    // OK, no output needed
  }
}

console.log("");
console.log("Divergentes:", divergentes.length);

if (divergentes.length === 0) {
  console.log("Nada a reparar.");
} else {
  for (const d of divergentes) {
    console.log(`  ${d.sku}: ${d.valorAtual.toFixed(2)} → ${d.valorEsperado.toFixed(2)}`);
  }
}

// 3. Verificar soma final da conta 3.1.2 em fevereiro
const { rows: saldo312 } = await client.query(`
  SELECT
    SUM(CASE WHEN ll."contaCreditoId" = $1 THEN ll.valor ELSE 0 END) as creditos,
    SUM(CASE WHEN ll."contaDebitoId" = $1 THEN ll.valor ELSE 0 END) as debitos
  FROM linhas_lancamento ll
  JOIN lancamentos l ON l.id = ll."lancamentoId"
  WHERE (ll."contaCreditoId" = $1 OR ll."contaDebitoId" = $1)
    AND l.data >= '2026-02-01' AND l.data < '2026-03-01'
    AND l.estornado = false
`, [conta312.id]);

const cred = parseFloat(saldo312[0].creditos || 0);
const deb = parseFloat(saldo312[0].debitos || 0);
console.log("");
console.log("=== Conta 3.1.2 fev/2026 (ESTADO ATUAL) ===");
console.log("Créditos:", cred.toFixed(2));
console.log("Débitos:", deb.toFixed(2));
console.log("Saldo (DRE):", (cred - deb).toFixed(2));

await client.end();
