// Valida a correcao do estoque no Balanco Patrimonial:
// compara o valor do estoque calculado como "foto do fim do mes" (reconstruido
// pelo historico de status) x o snapshot ATUAL (logica antiga) para varios meses.
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "apps", "web", ".env") });
const { Client } = require("pg");

const r2 = (n) => Math.round(n * 100) / 100;
const STATUS_EM_ESTOQUE = ["DISPONIVEL", "EM_TRANSITO", "REVISAO"];
// brtMonthEnd(year, month0) => primeiro instante do mes seguinte em BRT (UTC-3)
const brtMonthEnd = (year, month0) => new Date(Date.UTC(year, month0 + 1, 1, 3, 0, 0, 0));

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL nao encontrado"); process.exit(1); }
  console.log("Conectando em:", url.replace(/\/\/[^@]+@/, "//***@"));
  const client = new Client({ connectionString: url });
  await client.connect();

  // Snapshot ATUAL (logica antiga do balanco)
  const snap = await client.query(`
    SELECT COALESCE(SUM("valorCompra"),0) + COALESCE(SUM("custoManutencao"),0) AS v
    FROM pecas
    WHERE arquivado = false AND "origemTipo" = 'COMPRA'
      AND status IN ('DISPONIVEL','EM_TRANSITO','REVISAO')
  `);
  const snapshotAtual = r2(Number(snap.rows[0].v));

  // Peças COMPRA com custo (para reconstrucao)
  const pecas = await client.query(`
    SELECT id, status, "valorCompra", "custoManutencao", "createdAt"
    FROM pecas WHERE "origemTipo" = 'COMPRA'
  `);
  // Historico de status
  const hist = await client.query(`
    SELECT "pecaId", "statusNovo", "createdAt" FROM historico_status
    ORDER BY "createdAt" ASC
  `);
  const histByPeca = new Map();
  for (const h of hist.rows) {
    if (!histByPeca.has(h.pecaId)) histByPeca.set(h.pecaId, []);
    histByPeca.get(h.pecaId).push(h);
  }

  function estoqueValorFimMes(dataFimExclusivo) {
    let total = 0;
    for (const p of pecas.rows) {
      if (new Date(p.createdAt) >= dataFimExclusivo) continue;
      const hs = histByPeca.get(p.id) || [];
      let statusNaData = p.status; // fallback
      for (let i = hs.length - 1; i >= 0; i--) {
        if (new Date(hs[i].createdAt) < dataFimExclusivo) { statusNaData = hs[i].statusNovo; break; }
      }
      if (!STATUS_EM_ESTOQUE.includes(statusNaData)) continue;
      total += Number(p.valorCompra || 0) + Number(p.custoManutencao || 0);
    }
    return r2(total);
  }

  // Ultimos 8 meses ate o mes atual
  const now = new Date();
  const nowBrt = new Date(now.getTime() - 3 * 3600 * 1000);
  const anoAtual = nowBrt.getUTCFullYear();
  const mesAtual0 = nowBrt.getUTCMonth();

  console.log(`\nSnapshot ATUAL (logica antiga, igual para todos os meses): R$ ${snapshotAtual.toFixed(2)}\n`);
  console.log("Mes        | Estoque FIM DO MES (novo)  | vs snapshot atual");
  console.log("-----------|---------------------------|------------------");
  for (let i = 7; i >= 0; i--) {
    const d = new Date(Date.UTC(anoAtual, mesAtual0 - i, 1));
    const y = d.getUTCFullYear(), m0 = d.getUTCMonth();
    const fim = brtMonthEnd(y, m0);
    const v = estoqueValorFimMes(fim);
    const dif = r2(v - snapshotAtual);
    const label = `${y}-${String(m0 + 1).padStart(2, "0")}`;
    const marca = i === 0 ? "  <- mes atual" : "";
    console.log(`${label}    | R$ ${v.toFixed(2).padStart(20)} | ${dif >= 0 ? "+" : ""}${dif.toFixed(2)}${marca}`);
  }

  await client.end();
})().catch((e) => { console.error("Erro:", e.message); process.exit(1); });
