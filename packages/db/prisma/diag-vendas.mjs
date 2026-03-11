import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: "../../apps/web/.env" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: contas } = await client.query(`
  SELECT id, codigo FROM contas_contabeis WHERE codigo IN ('3.1.1', '3.1.2')
`);
const id311 = contas.find(c => c.codigo === '3.1.1').id;
const id312 = contas.find(c => c.codigo === '3.1.2').id;

const dataInicio = new Date(2026, 1, 1);
const dataFim = new Date(2026, 2, 0, 23, 59, 59);

// Query COM o fix: estornado=false AND estornoDeId IS NULL
const { rows } = await client.query(`
  SELECT
    cc.codigo,
    SUM(CASE WHEN ll."contaCreditoId" = cc.id THEN ll.valor ELSE 0 END) as creditos,
    SUM(CASE WHEN ll."contaDebitoId" = cc.id THEN ll.valor ELSE 0 END) as debitos
  FROM contas_contabeis cc
  JOIN linhas_lancamento ll ON (ll."contaCreditoId" = cc.id OR ll."contaDebitoId" = cc.id)
  JOIN lancamentos l ON l.id = ll."lancamentoId"
  WHERE cc.codigo IN ('3.1.1', '3.1.2')
    AND l.data >= $1 AND l.data <= $2
    AND l.estornado = false
    AND l."estornoDeId" IS NULL
  GROUP BY cc.codigo
  ORDER BY cc.codigo
`, [dataInicio, dataFim]);

console.log("=== Saldos fev/2026 COM FIX (estornado=false AND estornoDeId IS NULL) ===");
for (const r of rows) {
  const cred = parseFloat(r.creditos);
  const deb = parseFloat(r.debitos);
  console.log(r.codigo, "creditos:", cred.toFixed(2), "debitos:", deb.toFixed(2), "saldo:", (cred - deb).toFixed(2));
}

await client.end();
