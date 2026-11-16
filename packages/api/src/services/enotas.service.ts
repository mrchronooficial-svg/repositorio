// Integração com o eNotas Emissor (API de Vendas) para emissão de NF-e.
//
// Referência da API: Docs/ENOTAS_API_REFERENCIA.md
//
// Fluxo:
// - Emissão: cada nota do sistema vira uma "venda" no eNotas (POST /vendas) com
//   quandoEmitirNFe = 0 (emitir na hora). O eNotas usa a configuração fiscal da
//   conta (a mesma do Importador CSV).
// - Vendas acima do limite por nota são divididas em partes (uma venda no eNotas
//   por parte).
// - Status: o Emissor não tem webhooks, então consultamos GET /vendas/{id}.
// - Cancelamento: POST /vendas/{id}/cancelar. Fora do prazo de 24h o próprio
//   eNotas emite a NF-e de devolução (se habilitado no painel da empresa).

import prisma from "@gestaomrchrono/db";
import { env } from "@gestaomrchrono/env/server";
import { criarAlerta } from "./alerta.service";
import { brtParts } from "../utils/brt-date";

const ENOTAS_BASE_URL = "https://app.enotas.com.br/api";
const TIMEOUT_MS = 20_000;

// Limite por nota imposto pelo eNotas (em centavos): R$ 10.000,00
export const LIMITE_POR_NOTA_CENTAVOS = 1_000_000;

// Regra Mr. Chrono: vendas anteriores a novembro/2026 NUNCA são emitidas pela integração
// (as antigas foram ou serão tratadas por fora, via CSV/contador).
// 01/11/2026 00:00 em Brasília = 03:00 UTC
export const DATA_INICIO_EMISSAO = new Date("2026-11-01T03:00:00.000Z");

export function vendaPermiteEmissao(dataVenda: Date): boolean {
  return dataVenda.getTime() >= DATA_INICIO_EMISSAO.getTime();
}

// Chave de configuração (tabela configuracoes) que liga/desliga a emissão automática
export const CONFIG_EMISSAO_AUTOMATICA = "NFE_EMISSAO_AUTOMATICA";

type StatusNotaFiscal =
  | "PROCESSANDO"
  | "EMITIDA"
  | "ERRO"
  | "CANCELAMENTO_PROCESSANDO"
  | "CANCELADA"
  | "FALHA_CANCELAMENTO";

// Constantes do eNotas (extraídas do painel: ENotas.Constants)
const SITUACAO_NFE = {
  Pendente: 0,
  EmProcessoDeEmissao: 1,
  Emitida: 2,
  FalhaAoEmitir: 3,
  EmProcessoDeCancelamento: 4,
  Cancelada: 5,
  FalhaAoCancelar: 6,
  NaoEmitir: 7,
  EnviadoPorEmail: 8,
  EmitidaParcialmente: 9,
  CanceladaParcialmente: 10,
} as const;

const SITUACAO_VENDA = {
  EmAberto: 0,
  Vencida: 1,
  EmGarantia: 2,
  Completa: 3,
  Reembolsada: 4,
  Cancelada: 5,
} as const;

const MEIO_PAGAMENTO = {
  CartaoCredito: 2,
  Pix: 9,
} as const;

// ============================================
// Cliente HTTP
// ============================================

export class EnotasError extends Error {
  constructor(message: string, public readonly httpStatus?: number) {
    super(message);
    this.name = "EnotasError";
  }
}

export function enotasConfigurado(): boolean {
  return Boolean(env.ENOTAS_API_KEY);
}

async function enotasRequest<T>(
  path: string,
  options: { method: "GET" | "POST"; body?: unknown }
): Promise<T> {
  const apiKey = env.ENOTAS_API_KEY;
  if (!apiKey) {
    throw new EnotasError("Integração com o eNotas não configurada (ENOTAS_API_KEY ausente)");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ENOTAS_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Basic ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const texto = await response.text();

    if (!response.ok) {
      throw new EnotasError(extrairMensagemErro(texto, response.status), response.status);
    }

    return (texto ? JSON.parse(texto) : null) as T;
  } catch (error) {
    if (error instanceof EnotasError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new EnotasError("O eNotas não respondeu a tempo (timeout)");
    }
    throw new EnotasError(
      `Falha de comunicação com o eNotas: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

function extrairMensagemErro(texto: string, status: number): string {
  if (status === 401 || status === 403) {
    return "Acesso negado pelo eNotas (verifique a API Key)";
  }
  try {
    const json: unknown = JSON.parse(texto);
    if (Array.isArray(json)) {
      const mensagens = json
        .map((item) =>
          item && typeof item === "object" && "mensagem" in item
            ? String((item as { mensagem: unknown }).mensagem)
            : null
        )
        .filter(Boolean);
      if (mensagens.length > 0) return mensagens.join(" | ");
    }
    if (json && typeof json === "object") {
      const obj = json as Record<string, unknown>;
      for (const chave of ["mensagem", "message", "erro", "error"]) {
        if (typeof obj[chave] === "string") return obj[chave] as string;
      }
    }
  } catch {
    // resposta não é JSON
  }
  return `Erro ${status} no eNotas${texto ? `: ${texto.slice(0, 300)}` : ""}`;
}

// ============================================
// Tipos da API (somente os campos usados)
// ============================================

interface EnotasNfe {
  id?: string;
  situacao: number;
  tipoNFe?: number; // 1 = produto, 4 = devolução
  motivoSituacao?: string | null;
  cancelamentoRejeitado?: boolean | null;
  motivoRejeicaoCancelamento?: string | null; // JSON: {"mensagemErro": "...", ...}
  prefeitura?: {
    linkImpressao?: string | null;
    linkXml?: string | null;
    numero?: string | number | null;
    dataEmissao?: string | null;
  } | null;
}

interface EnotasVendaResponse {
  id: string;
  situacao: number;
  nfe: EnotasNfe | null;
  // Lista completa de notas da venda (inclui a NF-e de devolução, tipoNFe = 4).
  // Atenção: o campo "nfe" pode continuar "Emitida" mesmo com o cancelamento recusado;
  // a situação confiável fica aqui.
  ListaNFes?: EnotasNfe[] | null;
}

// ============================================
// Regras de negócio auxiliares
// ============================================

function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

function formatarDataBR(data: Date): string {
  const { year, month, day } = brtParts(data);
  return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
}

// "dd/MM/yyyy" => número de dias (para comparar datas); null se inválida
function diaDoCalendario(dataBR: string | null | undefined): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(dataBR ?? "");
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])) / 86_400_000);
}

// Divide um valor em partes de até R$ 10.000,00 (ex.: 25.000 => 10.000 + 10.000 + 5.000)
export function dividirEmPartes(valor: number): number[] {
  let restante = Math.round(valor * 100);
  const partes: number[] = [];
  while (restante > 0) {
    const parte = Math.min(restante, LIMITE_POR_NOTA_CENTAVOS);
    partes.push(parte / 100);
    restante -= parte;
  }
  return partes;
}

export async function emissaoAutomaticaLigada(): Promise<boolean> {
  const config = await prisma.configuracao.findUnique({
    where: { chave: CONFIG_EMISSAO_AUTOMATICA },
  });
  return config?.valor === "true";
}

// Valor que deve ser emitido para a venda (valor a declarar, ou valor final como fallback)
function valorAEmitir(venda: { valorDeclarar: unknown; valorFinal: unknown }): number {
  const declarar = venda.valorDeclarar != null ? Number(venda.valorDeclarar) : null;
  return declarar ?? Number(venda.valorFinal);
}

async function registrarProblema(vendaId: string, sku: string, mensagem: string) {
  try {
    await criarAlerta({
      tipo: "NFE_PROBLEMA",
      titulo: "Problema na NF-e",
      mensagem: `Venda ${sku}: ${mensagem}`,
      entidade: "VENDA",
      entidadeId: vendaId,
    });
  } catch {
    console.error(`[eNotas] Falha ao criar alerta da venda ${vendaId}`);
  }
}

// Status "vivos" de uma nota (que representam uma nota emitida ou em emissão)
const STATUS_VIVOS: StatusNotaFiscal[] = ["PROCESSANDO", "EMITIDA"];

// ============================================
// Emissão
// ============================================

export interface ResultadoEmissao {
  emitidas: number;
  erros: string[];
  ignorada?: string;
  /** Preenchido quando já existe no eNotas venda do mesmo cliente, data e valor (ex.: emitida pelo CSV) */
  possivelDuplicidade?: string;
}

interface EnotasVendaResumo {
  id: string;
  data: string;
  situacao: number;
  valorTotal: number;
  idExterno?: string | null;
  cliente?: { nome?: string | null; cpfCnpj?: string | null } | null;
}

/**
 * Procura no eNotas vendas do mesmo cliente (CPF/CNPJ), na mesma data e somando o mesmo
 * valor — sinal de que a nota já foi emitida por fora (Importador CSV).
 * Retorna uma descrição do que foi encontrado, ou null. Falha na consulta => null.
 */
async function verificarDuplicidadeNoEnotas(venda: {
  id: string;
  dataVenda: Date;
  cliente: { nome: string; cpfCnpj: string };
  valor: number;
}): Promise<string | null> {
  const primeiroNome = venda.cliente.nome.trim().split(/\s+/)[0]?.replace(/'/g, "''");
  if (!primeiroNome) return null;
  const documento = somenteDigitos(venda.cliente.cpfCnpj);
  const data = formatarDataBR(venda.dataVenda);

  try {
    const filtro = encodeURIComponent(`contains(cliente/nome, '${primeiroNome}')`);
    const ordem = encodeURIComponent("data desc");
    const resposta = await enotasRequest<{ data?: EnotasVendaResumo[] }>(
      `/vendas/getFilterBy?pageNumber=0&pageSize=100&orderBy=${ordem}&filter=${filtro}`,
      { method: "GET" }
    );
    // Mesmo cliente, até 10 dias de diferença da data da venda (a data no eNotas pode
    // divergir da data no sistema), venda não cancelada e que não foi criada por nós
    const JANELA_DIAS = 10;
    const diaVenda = diaDoCalendario(data);
    const candidatas = (resposta?.data ?? []).filter((v) => {
      const dia = diaDoCalendario(v.data);
      return (
        somenteDigitos(v.cliente?.cpfCnpj) === documento &&
        dia !== null &&
        diaVenda !== null &&
        Math.abs(dia - diaVenda) <= JANELA_DIAS &&
        v.situacao !== SITUACAO_VENDA.Cancelada &&
        v.situacao !== SITUACAO_VENDA.Reembolsada &&
        !(v.idExterno ?? "").startsWith(venda.id)
      );
    });

    // Agrupa por data (vendas acima de R$ 10 mil viram várias no mesmo dia) e compara o total
    const porData = new Map<string, EnotasVendaResumo[]>();
    for (const v of candidatas) porData.set(v.data, [...(porData.get(v.data) ?? []), v]);
    for (const [dataEnotas, grupo] of porData) {
      const soma = grupo.reduce((acc, v) => acc + Number(v.valorTotal || 0), 0);
      const algumaIgual = grupo.find((v) => Math.abs(Number(v.valorTotal) - venda.valor) < 0.01);
      if (Math.abs(soma - venda.valor) < 0.01 || algumaIgual) {
        const valores = algumaIgual
          ? `R$ ${Number(algumaIgual.valorTotal).toFixed(2)}`
          : grupo.map((v) => `R$ ${Number(v.valorTotal).toFixed(2)}`).join(" + ");
        return `Já existe no eNotas venda deste cliente em ${dataEnotas} no mesmo valor (${valores}). Provavelmente a nota já foi emitida pelo CSV.`;
      }
    }
    return null;
  } catch (error) {
    console.error(`[eNotas] Não foi possível verificar duplicidade da venda ${venda.id}`, error);
    return null;
  }
}

/**
 * Envia a venda ao eNotas para emissão da(s) NF-e(s).
 * Não lança erro: falhas ficam registradas na nota (status ERRO) e geram alerta.
 * Na primeira emissão de uma venda, verifica antes se a nota já não foi emitida por fora
 * (CSV); nesse caso não emite e devolve `possivelDuplicidade`, a menos que
 * `ignorarDuplicidade` seja true.
 */
export async function emitirNotasVenda(
  vendaId: string,
  opcoes?: { ignorarDuplicidade?: boolean }
): Promise<ResultadoEmissao> {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: {
      cliente: true,
      peca: { select: { sku: true, marca: true, modelo: true } },
      notasFiscais: { select: { status: true, ativa: true, emissao: true } },
    },
  });

  if (!venda) return { emitidas: 0, erros: ["Venda não encontrada"] };
  if (venda.cancelada) return { emitidas: 0, erros: [], ignorada: "Venda cancelada" };
  if (!vendaPermiteEmissao(venda.dataVenda)) {
    return {
      emitidas: 0,
      erros: [],
      ignorada: "Venda anterior a 01/11/2026: a emissão pelo sistema não é permitida",
    };
  }

  const jaTemNotaViva = venda.notasFiscais.some(
    (n) => n.ativa && STATUS_VIVOS.includes(n.status as StatusNotaFiscal)
  );
  if (jaTemNotaViva) {
    return { emitidas: 0, erros: [], ignorada: "Venda já possui NF-e emitida ou em emissão" };
  }

  // Trava contra duplicidade com notas emitidas por fora (só na primeira emissão da venda)
  if (venda.notasFiscais.length === 0 && !opcoes?.ignorarDuplicidade) {
    const duplicidade = await verificarDuplicidadeNoEnotas({
      id: venda.id,
      dataVenda: venda.dataVenda,
      cliente: venda.cliente,
      valor: valorAEmitir(venda),
    });
    if (duplicidade) {
      return { emitidas: 0, erros: [], possivelDuplicidade: duplicidade };
    }
  }

  // Notas antigas com erro (ou já canceladas) deixam de ser as "ativas"
  await prisma.notaFiscal.updateMany({
    where: { vendaId, ativa: true },
    data: { ativa: false },
  });

  const valor = valorAEmitir(venda);
  if (!(valor > 0)) {
    const msg = "Valor a declarar é zero ou inválido";
    await registrarProblema(vendaId, venda.peca.sku, msg);
    return { emitidas: 0, erros: [msg] };
  }

  const emissao = venda.notasFiscais.reduce((max, n) => Math.max(max, n.emissao), 0) + 1;
  const partes = dividirEmPartes(valor);
  const cliente = venda.cliente;
  const erros: string[] = [];
  let emitidas = 0;

  for (let i = 0; i < partes.length; i++) {
    const valorParte = partes[i]!;
    const nota = await prisma.notaFiscal.create({
      data: {
        vendaId,
        emissao,
        parte: i + 1,
        totalPartes: partes.length,
        valor: valorParte,
        idExterno: `${vendaId}-${emissao}-${i + 1}`,
        status: "PROCESSANDO",
      },
    });

    const corpo = {
      idExterno: nota.idExterno,
      data: formatarDataBR(venda.dataVenda),
      cliente: {
        cpfCnpj: somenteDigitos(cliente.cpfCnpj),
        nome: cliente.nome,
        email: cliente.email || undefined,
        telefone: somenteDigitos(cliente.telefone) || undefined,
        endereco: {
          pais: "Brasil",
          uf: cliente.estado,
          cidade: cliente.cidade,
          logradouro: cliente.rua,
          // Regra Mr. Chrono: número vazio vai como "1"
          numero: cliente.numero?.trim() ? cliente.numero.trim() : "1",
          complemento: cliente.complemento || null,
          bairro: cliente.bairro,
          cep: somenteDigitos(cliente.cep),
        },
      },
      produto: {
        // Mesmo nome usado no CSV do importador (Produto_Nome)
        nome: `${venda.peca.marca} ${venda.peca.modelo}`,
        valorTotal: valorParte,
      },
      valorTotal: valorParte,
      valorTotalNFe: valorParte,
      quandoEmitirNFe: 0, // emitir na hora
      enviarNFeCliente: false,
      meioPagamento: venda.formaPagamento === "PIX" ? MEIO_PAGAMENTO.Pix : MEIO_PAGAMENTO.CartaoCredito,
      tags: "sistema-mrchrono",
    };

    try {
      const resposta = await enotasRequest<{ vendaId: string }>("/vendas", {
        method: "POST",
        body: corpo,
      });
      await prisma.notaFiscal.update({
        where: { id: nota.id },
        data: { enotasVendaId: resposta?.vendaId ?? null },
      });
      emitidas++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      erros.push(msg);
      await prisma.notaFiscal.update({
        where: { id: nota.id },
        data: { status: "ERRO", mensagemErro: msg },
      });
      const sufixo = partes.length > 1 ? ` (parte ${i + 1}/${partes.length})` : "";
      await registrarProblema(vendaId, venda.peca.sku, `falha ao enviar NF-e${sufixo}: ${msg}`);
    }
  }

  return { emitidas, erros };
}

/**
 * Chamado quando o status de pagamento de uma venda muda.
 * Dispara a emissão quando a venda acaba de ficar PAGA e a emissão automática está ligada.
 */
export async function aoAtualizarStatusPagamento(
  vendaId: string,
  statusAnterior: string,
  statusNovo: string
): Promise<void> {
  if (statusNovo !== "PAGO" || statusAnterior === "PAGO") return;
  try {
    if (!enotasConfigurado() || !(await emissaoAutomaticaLigada())) return;
    const resultado = await emitirNotasVenda(vendaId);
    if (resultado.possivelDuplicidade) {
      const venda = await prisma.venda.findUnique({
        where: { id: vendaId },
        select: { peca: { select: { sku: true } } },
      });
      await registrarProblema(
        vendaId,
        venda?.peca.sku ?? vendaId,
        `NF-e NÃO emitida automaticamente. ${resultado.possivelDuplicidade} Se for outra venda, emita pela aba NFe.`
      );
    }
  } catch (error) {
    // Nunca bloquear o registro do pagamento por causa da NF-e
    console.error(`[eNotas] Erro na emissão automática da venda ${vendaId}`, error);
  }
}

// ============================================
// Consulta / sincronização de status
// ============================================

const TIPO_NFE_DEVOLUCAO = 4;

// Separa a NF-e da venda e a eventual NF-e de devolução
function notasDaResposta(resposta: EnotasVendaResponse): {
  notaVenda: EnotasNfe | null;
  devolucao: EnotasNfe | null;
} {
  const lista = resposta.ListaNFes ?? [];
  const devolucao = lista.find((n) => n.tipoNFe === TIPO_NFE_DEVOLUCAO) ?? null;
  const notaVenda = lista.find((n) => n.tipoNFe !== TIPO_NFE_DEVOLUCAO) ?? resposta.nfe ?? null;
  return { notaVenda, devolucao };
}

function motivoRejeicaoCancelamento(nota: EnotasNfe | null): string | null {
  const bruto = nota?.motivoRejeicaoCancelamento;
  if (!bruto) return null;
  try {
    const json: unknown = JSON.parse(bruto);
    if (json && typeof json === "object" && "mensagemErro" in json) {
      return String((json as { mensagemErro: unknown }).mensagemErro);
    }
  } catch {
    // texto simples
  }
  return bruto;
}

interface StatusMapeado {
  status: StatusNotaFiscal;
  mensagem?: string | null;
}

function mapearStatus(statusAtual: StatusNotaFiscal, resposta: EnotasVendaResponse): StatusMapeado {
  const { notaVenda, devolucao } = notasDaResposta(resposta);
  const situacao = notaVenda?.situacao;

  // Fluxo de cancelamento
  if (statusAtual === "CANCELAMENTO_PROCESSANDO" || statusAtual === "CANCELADA") {
    if (situacao === SITUACAO_NFE.Cancelada || situacao === SITUACAO_NFE.CanceladaParcialmente) {
      return { status: "CANCELADA" };
    }
    // Fora do prazo: anulada pela NF-e de devolução
    if (devolucao) {
      if (devolucao.situacao === SITUACAO_NFE.Emitida || devolucao.situacao === SITUACAO_NFE.EnviadoPorEmail) {
        return { status: "CANCELADA", mensagem: "Anulada por NF-e de devolução" };
      }
      if (devolucao.situacao === SITUACAO_NFE.FalhaAoEmitir) {
        return {
          status: "FALHA_CANCELAMENTO",
          mensagem: `Falha ao emitir a NF-e de devolução: ${devolucao.motivoSituacao || "motivo não informado"}`,
        };
      }
      return { status: "CANCELAMENTO_PROCESSANDO" };
    }
    if (situacao === SITUACAO_NFE.FalhaAoCancelar || notaVenda?.cancelamentoRejeitado) {
      const motivo = motivoRejeicaoCancelamento(notaVenda) || notaVenda?.motivoSituacao;
      return {
        status: "FALHA_CANCELAMENTO",
        mensagem:
          `${motivo || "Cancelamento recusado"}. ` +
          "A NF-e de devolução não foi emitida (verifique se a devolução automática está ligada no eNotas).",
      };
    }
    // Nota que nunca chegou a ser emitida: nada a anular
    if (
      situacao === SITUACAO_NFE.Pendente ||
      situacao === SITUACAO_NFE.NaoEmitir ||
      situacao === SITUACAO_NFE.FalhaAoEmitir ||
      situacao == null
    ) {
      const vendaCancelada =
        resposta.situacao === SITUACAO_VENDA.Cancelada || resposta.situacao === SITUACAO_VENDA.Reembolsada;
      return vendaCancelada ? { status: "CANCELADA" } : { status: "CANCELAMENTO_PROCESSANDO" };
    }
    return { status: "CANCELAMENTO_PROCESSANDO" };
  }

  switch (situacao) {
    case SITUACAO_NFE.Emitida:
    case SITUACAO_NFE.EnviadoPorEmail:
    case SITUACAO_NFE.EmitidaParcialmente:
      return { status: "EMITIDA" };
    case SITUACAO_NFE.FalhaAoEmitir:
      return { status: "ERRO", mensagem: notaVenda?.motivoSituacao || "O eNotas não informou o motivo" };
    case SITUACAO_NFE.NaoEmitir:
      return { status: "ERRO", mensagem: "O eNotas marcou esta venda como 'Não emitir'" };
    case SITUACAO_NFE.EmProcessoDeCancelamento:
      return { status: "CANCELAMENTO_PROCESSANDO" };
    case SITUACAO_NFE.Cancelada:
    case SITUACAO_NFE.CanceladaParcialmente:
      return { status: "CANCELADA" };
    case SITUACAO_NFE.FalhaAoCancelar:
      return {
        status: "FALHA_CANCELAMENTO",
        mensagem: motivoRejeicaoCancelamento(notaVenda) || "Cancelamento recusado",
      };
    default:
      return { status: "PROCESSANDO" };
  }
}

/** Consulta uma nota no eNotas e atualiza o banco. Retorna o novo status. */
export async function consultarNota(notaId: string): Promise<StatusNotaFiscal | null> {
  const nota = await prisma.notaFiscal.findUnique({
    where: { id: notaId },
    include: { venda: { select: { id: true, peca: { select: { sku: true } } } } },
  });
  if (!nota || !nota.enotasVendaId) return null;

  const statusAnterior = nota.status as StatusNotaFiscal;

  let resposta: EnotasVendaResponse;
  try {
    resposta = await enotasRequest<EnotasVendaResponse>(`/vendas/${nota.enotasVendaId}`, {
      method: "GET",
    });
  } catch (error) {
    await prisma.notaFiscal.update({
      where: { id: nota.id },
      data: { ultimaConsultaEm: new Date() },
    });
    console.error(`[eNotas] Erro ao consultar nota ${nota.id}`, error);
    return statusAnterior;
  }

  const { status: novoStatus, mensagem } = mapearStatus(statusAnterior, resposta);
  const { notaVenda } = notasDaResposta(resposta);
  const prefeitura = notaVenda?.prefeitura;

  const dados: Record<string, unknown> = {
    status: novoStatus,
    situacaoEnotas: notaVenda?.situacao ?? null,
    enotasNfeId: notaVenda?.id ?? nota.enotasNfeId,
    ultimaConsultaEm: new Date(),
  };

  // PDF/XML/número sempre da NF-e da venda (nunca da NF-e de devolução)
  if (prefeitura?.linkImpressao) dados.pdfUrl = prefeitura.linkImpressao;
  if (prefeitura?.linkXml) dados.xmlUrl = prefeitura.linkXml;
  if (prefeitura?.numero != null) dados.numero = String(prefeitura.numero);

  if (novoStatus === "EMITIDA") {
    if (!nota.emitidaEm) dados.emitidaEm = new Date();
    dados.mensagemErro = null;
  } else if (mensagem !== undefined) {
    dados.mensagemErro = mensagem;
  }

  if (novoStatus === "CANCELADA" && !nota.canceladaEm) {
    dados.canceladaEm = new Date();
  }

  await prisma.notaFiscal.update({ where: { id: nota.id }, data: dados });

  if (novoStatus !== statusAnterior) {
    if (novoStatus === "ERRO") {
      await registrarProblema(
        nota.vendaId,
        nota.venda.peca.sku,
        `NF-e negada: ${String(dados.mensagemErro)}`
      );
    } else if (novoStatus === "FALHA_CANCELAMENTO") {
      await registrarProblema(
        nota.vendaId,
        nota.venda.peca.sku,
        `não foi possível cancelar a NF-e: ${String(dados.mensagemErro)}`
      );
    }
    await atualizarNfeDeclarada(nota.vendaId);
  }

  return novoStatus;
}

// Mantém o campo legado "nfeDeclarada" coerente (usado no filtro do CSV de exportação)
async function atualizarNfeDeclarada(vendaId: string) {
  const ativas = await prisma.notaFiscal.findMany({
    where: { vendaId, ativa: true },
    select: { status: true },
  });
  if (ativas.length === 0) return;
  const todasEmitidas = ativas.every((n) => n.status === "EMITIDA");
  await prisma.venda.update({
    where: { id: vendaId },
    data: { nfeDeclarada: todasEmitidas },
  });
}

/**
 * Consulta no eNotas as notas que ainda estão em processamento.
 * Chamado periodicamente pelo front (aviso do topo) e pela aba NFe.
 */
export async function sincronizarNotasPendentes(opcoes?: {
  intervaloMinimoMs?: number;
  limite?: number;
}): Promise<number> {
  if (!enotasConfigurado()) return 0;
  const intervalo = opcoes?.intervaloMinimoMs ?? 60_000;
  const corte = new Date(Date.now() - intervalo);

  const pendentes = await prisma.notaFiscal.findMany({
    where: {
      status: { in: ["PROCESSANDO", "CANCELAMENTO_PROCESSANDO"] },
      enotasVendaId: { not: null },
      OR: [{ ultimaConsultaEm: null }, { ultimaConsultaEm: { lt: corte } }],
    },
    orderBy: { ultimaConsultaEm: { sort: "asc", nulls: "first" } },
    take: opcoes?.limite ?? 10,
    select: { id: true },
  });

  for (const nota of pendentes) {
    await consultarNota(nota.id);
  }
  return pendentes.length;
}

// ============================================
// Cancelamento
// ============================================

export interface ResultadoCancelamento {
  solicitadas: number;
  falhas: string[];
}

/**
 * Cancela no eNotas todas as notas ativas da venda.
 * Até 24h o eNotas cancela a NF-e; depois disso emite a NF-e de devolução.
 * Não lança erro: falhas ficam como FALHA_CANCELAMENTO e geram alerta.
 */
export async function cancelarNotasVenda(vendaId: string): Promise<ResultadoCancelamento> {
  const notas = await prisma.notaFiscal.findMany({
    where: {
      vendaId,
      ativa: true,
      status: { in: ["PROCESSANDO", "EMITIDA", "ERRO", "FALHA_CANCELAMENTO"] },
    },
    include: { venda: { select: { peca: { select: { sku: true } } } } },
  });

  const falhas: string[] = [];
  let solicitadas = 0;

  for (const nota of notas) {
    // Nota que nunca chegou ao eNotas: não há nada para cancelar lá
    if (!nota.enotasVendaId) {
      await prisma.notaFiscal.update({
        where: { id: nota.id },
        data: { status: "CANCELADA", canceladaEm: new Date() },
      });
      continue;
    }

    try {
      await enotasRequest(`/vendas/${nota.enotasVendaId}/cancelar`, { method: "POST" });
      await prisma.notaFiscal.update({
        where: { id: nota.id },
        data: { status: "CANCELAMENTO_PROCESSANDO", mensagemErro: null, ultimaConsultaEm: null },
      });
      solicitadas++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      falhas.push(msg);
      await prisma.notaFiscal.update({
        where: { id: nota.id },
        data: { status: "FALHA_CANCELAMENTO", mensagemErro: msg },
      });
      await registrarProblema(vendaId, nota.venda.peca.sku, `falha ao cancelar a NF-e no eNotas: ${msg}`);
    }
  }

  return { solicitadas, falhas };
}

/**
 * Valor mudou depois da emissão: cancela as notas atuais e emite novas com o valor novo.
 */
export async function reemitirNotasVenda(vendaId: string): Promise<{
  cancelamento: ResultadoCancelamento;
  emissao: ResultadoEmissao;
}> {
  const cancelamento = await cancelarNotasVenda(vendaId);
  // Se alguma nota antiga não pôde ser cancelada, NÃO emite a nova (evita nota em duplicidade)
  if (cancelamento.falhas.length > 0) {
    return {
      cancelamento,
      emissao: { emitidas: 0, erros: [], ignorada: "Cancelamento da nota anterior falhou" },
    };
  }
  // As notas antigas deixam de ser as ativas (seguem sendo acompanhadas até cancelarem)
  await prisma.notaFiscal.updateMany({
    where: { vendaId, ativa: true },
    data: { ativa: false },
  });
  const emissao = await emitirNotasVenda(vendaId);
  return { cancelamento, emissao };
}
