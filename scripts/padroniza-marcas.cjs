// Padroniza a coluna "marca" das pecas, unificando variantes de grafia que
// hoje aparecem como marcas distintas nos relatorios (ex: grafico de lucro
// bruto por marca no dashboard).
//
// Uso:
//   node scripts/padroniza-marcas.cjs          -> apenas mostra o que mudaria
//   node scripts/padroniza-marcas.cjs --aplicar -> grava as alteracoes

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "apps", "web", ".env") });

const { Client } = require("pg");

// De -> Para. A comparacao e feita sobre a marca ja com espacos aparados.
const RENOMEACOES = {
  "Universal Geneve": "Universal Genève",
  "Universal Gèneve": "Universal Genève",
  Universal: "Universal Genève",
  "Baume e Mercier": "Baume & Mercier",
  MIdo: "Mido",
};

function padronizar(marca) {
  const limpa = marca.trim().replace(/\s+/g, " ");
  return RENOMEACOES[limpa] ?? limpa;
}

(async () => {
  const aplicar = process.argv.includes("--aplicar");

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL nao encontrado em apps/web/.env");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  const { rows } = await client.query(
    `SELECT marca, COUNT(*)::int AS total FROM pecas GROUP BY marca ORDER BY marca ASC`
  );

  const mudancas = rows
    .map((r) => ({ de: r.marca, para: padronizar(r.marca), total: r.total }))
    .filter((m) => m.de !== m.para);

  if (mudancas.length === 0) {
    console.log("Nenhuma marca precisa ser padronizada.");
    await client.end();
    return;
  }

  console.log(aplicar ? "Aplicando:" : "Previa (use --aplicar para gravar):");
  let totalPecas = 0;
  for (const m of mudancas) {
    console.log(
      `  ${JSON.stringify(m.de).padEnd(24)} -> ${JSON.stringify(m.para).padEnd(24)} (${m.total} peca${m.total === 1 ? "" : "s"})`
    );
    totalPecas += m.total;
  }
  console.log(`  ${totalPecas} pecas afetadas.`);

  if (!aplicar) {
    await client.end();
    return;
  }

  await client.query("BEGIN");
  try {
    for (const m of mudancas) {
      await client.query(`UPDATE pecas SET marca = $1 WHERE marca = $2`, [
        m.para,
        m.de,
      ]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  const { rows: depois } = await client.query(
    `SELECT marca, COUNT(*)::int AS total FROM pecas GROUP BY marca ORDER BY marca ASC`
  );
  console.log("\nMarcas apos a padronizacao:");
  for (const r of depois) {
    console.log(`  ${r.marca.padEnd(24)} ${r.total}`);
  }

  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
