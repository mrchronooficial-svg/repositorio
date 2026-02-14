"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Plus, RotateCcw, Filter, Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/utils/trpc";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { TIPO_LANCAMENTO_LABELS } from "@/lib/constants";

// ============================================
// TIPOS E HELPERS PARA IMPORTAÇÃO
// ============================================

interface LinhaImportacao {
  data: Date | null;
  descricao: string;
  valor: number;
  contaDebitoId: string; // override individual (ou vazio = usa padrão)
  contaOriginal: string; // texto original da planilha (para mostrar aviso se não resolveu)
  erro: string | null;
}

function normalizarNomeColuna(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseDataExcel(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;

  // Data nativa do Excel (número serial)
  if (typeof raw === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const result = new Date(excelEpoch.getTime() + raw * 86400000);
    if (!isNaN(result.getTime())) return result;
    return null;
  }

  const str = String(raw).trim();

  // DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const d = new Date(+brMatch[3], +brMatch[2] - 1, +brMatch[1], 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3], 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: tentar Date.parse
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

function parseValor(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return raw;

  // Remove R$, espaços, pontos de milhar e troca vírgula por ponto
  const str = String(raw)
    .replace(/R\$\s*/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseLinhasExcel(
  rows: Record<string, unknown>[],
  contasDisponiveis: { id: string; codigo: string; nome: string }[]
): LinhaImportacao[] {
  // Criar lookup por código e nome normalizado para matching
  const contaPorCodigo = new Map<string, string>();
  const contaPorNome = new Map<string, string>();
  for (const c of contasDisponiveis) {
    contaPorCodigo.set(c.codigo.trim(), c.id);
    contaPorNome.set(normalizarNomeColuna(c.nome), c.id);
  }

  return rows.map((row) => {
    const keys = Object.keys(row);
    let dataRaw: unknown = undefined;
    let descRaw: unknown = undefined;
    let valorRaw: unknown = undefined;
    let contaRaw: unknown = undefined;

    for (const key of keys) {
      const norm = normalizarNomeColuna(key);
      if (norm === "data") dataRaw = row[key];
      else if (["descricao", "descriçao", "descricão", "descrição"].includes(norm)) descRaw = row[key];
      else if (norm === "valor") valorRaw = row[key];
      else if (["conta", "rubrica", "conta despesa", "conta de despesa", "categoria"].includes(norm)) contaRaw = row[key];
    }

    const data = parseDataExcel(dataRaw);
    const descricao = descRaw ? String(descRaw).trim() : "";
    const valor = parseValor(valorRaw);

    // Tentar resolver conta da planilha
    let contaDebitoId = "";
    const contaOriginal = (contaRaw != null && String(contaRaw).trim() !== "") ? String(contaRaw).trim() : "";

    if (contaOriginal) {
      // Tentar match por código (ex: "4.1.1")
      if (contaPorCodigo.has(contaOriginal)) {
        contaDebitoId = contaPorCodigo.get(contaOriginal)!;
      } else {
        // Tentar match por nome normalizado
        const contaNorm = normalizarNomeColuna(contaOriginal);
        if (contaPorNome.has(contaNorm)) {
          contaDebitoId = contaPorNome.get(contaNorm)!;
        }
      }
    }

    let erro: string | null = null;
    if (!data) erro = "Data invalida";
    else if (!descricao) erro = "Descricao vazia";
    else if (valor <= 0) erro = "Valor invalido";
    else if (contaOriginal && !contaDebitoId) erro = `Conta nao encontrada: "${contaOriginal}"`;

    return { data, descricao, valor, contaDebitoId, contaOriginal, erro };
  });
}

function gerarModeloPlanilha(contas: { codigo: string; nome: string }[]) {
  const wb = XLSX.utils.book_new();

  // Pegar até 3 nomes reais de rubricas para exemplo
  const exemplos = contas.slice(0, 3);

  // Aba 1: Modelo para preenchimento
  const data: (string | number)[][] = [
    ["Data", "Descricao", "Valor", "Conta despesa"],
    ["15/01/2025", "Contabilidade mensal", 500.0, exemplos[0]?.nome ?? ""],
    ["20/01/2025", "Aluguel escritorio", 2000.0, exemplos[1]?.nome ?? ""],
    ["25/01/2025", "Material de escritorio", 150.0, exemplos[2]?.nome ?? exemplos[0]?.nome ?? ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, "Despesas");

  // Aba 2: Rubricas do sistema (copiar nome exato daqui para a coluna "Conta despesa")
  const rubricasData = [
    ["Codigo", "Nome da Rubrica (copie o nome exato para a coluna 'Conta despesa')"],
    ...contas.map((c) => [c.codigo, c.nome]),
  ];
  const wsRubricas = XLSX.utils.aoa_to_sheet(rubricasData);
  wsRubricas["!cols"] = [{ wch: 14 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsRubricas, "Rubricas");

  XLSX.writeFile(wb, "modelo-importacao-despesas.xlsx");
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function LancamentosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");

  // Estado do dialog de importação
  const [importOpen, setImportOpen] = useState(false);
  const [linhasImport, setLinhasImport] = useState<LinhaImportacao[]>([]);
  const [contaDebitoPadrao, setContaDebitoPadrao] = useState<string>("");
  const [contaCreditoId, setContaCreditoId] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery(
    trpc.financeiro.listLancamentos.queryOptions({
      page,
      limit: 20,
      search: search || undefined,
      tipo: tipoFilter !== "all" ? tipoFilter as "MANUAL" : undefined,
    })
  );

  const { data: contasAnaliticas } = useQuery(
    trpc.financeiro.listContasAnaliticas.queryOptions()
  );

  const estornarMutation = useMutation(
    trpc.financeiro.estornarLancamento.mutationOptions({
      onSuccess: () => {
        toast.success("Lancamento estornado com sucesso");
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listLancamentos"]] });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const importarMutation = useMutation(
    trpc.financeiro.importarLancamentos.mutationOptions({
      onSuccess: (result) => {
        toast.success(`${result.quantidade} lancamentos importados com sucesso`);
        queryClient.invalidateQueries({ queryKey: [["financeiro", "listLancamentos"]] });
        fecharDialogImport();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  // Contas filtradas
  const contasDespesa = (contasAnaliticas ?? []).filter((c) => c.codigo.startsWith("4"));
  const contasBanco = (contasAnaliticas ?? []).filter(
    (c) => c.codigo.startsWith("1.1.1")
  );

  // Linhas válidas para importação
  const linhasValidas = linhasImport.filter((l) => !l.erro);

  const fecharDialogImport = useCallback(() => {
    setImportOpen(false);
    setLinhasImport([]);
    setContaDebitoPadrao("");
    setContaCreditoId("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target?.result;
      if (!arrayBuffer) return;

      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) {
        toast.error("Planilha vazia ou invalida");
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      if (rows.length === 0) {
        toast.error("Nenhuma linha encontrada na planilha");
        return;
      }

      if (rows.length > 500) {
        toast.error("Maximo 500 linhas por importacao");
        return;
      }

      const linhas = parseLinhasExcel(rows, contasDespesa);
      setLinhasImport(linhas);
    };
    reader.readAsArrayBuffer(file);
  }, [contasDespesa]);

  // Verificar se todas as linhas válidas já têm conta da planilha
  const todasLinhasTemConta = linhasValidas.length > 0 && linhasValidas.every((l) => l.contaDebitoId !== "");

  const handleImportar = () => {
    if (!todasLinhasTemConta && !contaDebitoPadrao) {
      toast.error("Selecione a conta de despesa padrao (ou preencha a coluna 'Conta' na planilha)");
      return;
    }
    if (!contaCreditoId) {
      toast.error("Selecione a conta de saida (banco)");
      return;
    }
    if (linhasValidas.length === 0) {
      toast.error("Nenhuma linha valida para importar");
      return;
    }

    const lancamentos = linhasValidas.map((l) => ({
      data: l.data!,
      descricao: l.descricao,
      valor: l.valor,
      contaDebitoId: l.contaDebitoId || contaDebitoPadrao,
      contaCreditoId: contaCreditoId,
    }));

    importarMutation.mutate({ lancamentos });
  };

  const updateLinhaContaDebito = (index: number, contaId: string) => {
    setLinhasImport((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], contaDebitoId: contaId };
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lancamentos Contabeis</h1>
          <p className="text-muted-foreground">
            Historico de todos os lancamentos (manuais e automaticos)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Planilha
          </Button>
          <Button onClick={() => router.push("/financeiro/lancamentos/novo" as Route)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lancamento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por descricao..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={tipoFilter}
              onValueChange={(v) => {
                setTipoFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-64">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="AUTOMATICO_VENDA">Automatico (Venda)</SelectItem>
                <SelectItem value="AUTOMATICO_DESPESA_RECORRENTE">Despesa Recorrente</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                <SelectItem value="DISTRIBUICAO_LUCROS">Distribuicao</SelectItem>
                <SelectItem value="ANTECIPACAO">Antecipacao</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead className="w-40">Tipo</TableHead>
                <TableHead className="text-right w-32">Valor</TableHead>
                <TableHead className="w-20">Linhas</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.lancamentos && data.lancamentos.length > 0 ? (
                data.lancamentos.map((l) => {
                  const totalValor = l.linhas.reduce(
                    (acc, line) => acc + Number(line.valor),
                    0
                  );
                  return (
                    <TableRow key={l.id} className={l.estornado ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {l.numero}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(l.data)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.descricao}
                        {l.estornado && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Estornado
                          </Badge>
                        )}
                        {!l.recorrente && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            One-off
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {TIPO_LANCAMENTO_LABELS[l.tipo] || l.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(totalValor)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {l.linhas.length}
                      </TableCell>
                      <TableCell>
                        {!l.estornado && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            onClick={() => {
                              if (confirm("Deseja estornar este lancamento?")) {
                                estornarMutation.mutate({ id: l.id });
                              }
                            }}
                            title="Estornar"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum lancamento encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginacao */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.pages}
            onClick={() => setPage(page + 1)}
          >
            Proxima
          </Button>
        </div>
      )}

      {/* Dialog de Importacao */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) fecharDialogImport(); else setImportOpen(true); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Despesas via Planilha
            </DialogTitle>
            <DialogDescription>
              Carregue um arquivo .xlsx com as colunas Data, Descricao, Valor e opcionalmente Conta (codigo ou nome da rubrica).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload + Template */}
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label>Arquivo Excel (.xlsx)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
                {fileName && (
                  <p className="text-xs text-muted-foreground">{fileName}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => gerarModeloPlanilha(contasDespesa)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar modelo
              </Button>
            </div>

            {/* Selecao de contas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Conta de despesa (debito)
                  {todasLinhasTemConta && (
                    <span className="text-xs text-green-600 ml-2 font-normal">
                      — Todas as linhas ja tem conta da planilha
                    </span>
                  )}
                </Label>
                <Select value={contaDebitoPadrao} onValueChange={setContaDebitoPadrao}>
                  <SelectTrigger>
                    <SelectValue placeholder={todasLinhasTemConta ? "Opcional — contas ja definidas na planilha" : "Selecione a conta de despesa"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contasDespesa.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigo} - {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {todasLinhasTemConta
                    ? "Opcional. As contas da planilha serao usadas. Selecione aqui apenas para sobrescrever linhas sem conta."
                    : "Conta padrao para linhas sem conta especificada (pode alterar individualmente)"
                  }
                </p>
              </div>
              <div className="space-y-2">
                <Label>Conta de saida (credito)</Label>
                <Select value={contaCreditoId} onValueChange={setContaCreditoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasBanco.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigo} - {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview da planilha */}
            {linhasImport.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Preview ({linhasValidas.length} validos de {linhasImport.length} total)
                  </p>
                  {linhasImport.length - linhasValidas.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {linhasImport.length - linhasValidas.length} com erro
                    </Badge>
                  )}
                </div>

                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="w-28">Data</TableHead>
                        <TableHead>Descricao</TableHead>
                        <TableHead className="text-right w-28">Valor</TableHead>
                        <TableHead className="w-48">Conta despesa</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhasImport.map((linha, idx) => (
                        <TableRow
                          key={idx}
                          className={linha.erro ? "bg-red-50" : ""}
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-sm">
                            {linha.data
                              ? linha.data.toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm truncate max-w-[200px]">
                            {linha.descricao || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {linha.valor > 0
                              ? formatCurrency(linha.valor)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {!linha.erro && (
                              <Select
                                value={linha.contaDebitoId || "default"}
                                onValueChange={(v) =>
                                  updateLinhaContaDebito(idx, v === "default" ? "" : v)
                                }
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Padrao" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">
                                    Usar padrao
                                  </SelectItem>
                                  {contasDespesa.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.codigo} - {c.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {linha.erro ? (
                              <Badge variant="destructive" className="text-[10px]">
                                {linha.erro}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fecharDialogImport}>
              Cancelar
            </Button>
            <Button
              onClick={handleImportar}
              disabled={
                linhasValidas.length === 0 ||
                (!todasLinhasTemConta && !contaDebitoPadrao) ||
                !contaCreditoId ||
                importarMutation.isPending
              }
            >
              {importarMutation.isPending
                ? "Importando..."
                : `Importar ${linhasValidas.length} Lancamentos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
