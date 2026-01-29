"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  X,
  Filter,
  Download,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { trpc } from "@/utils/trpc";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const ACAO_LABELS: Record<string, string> = {
  CRIAR: "Criar",
  EDITAR: "Editar",
  EXCLUIR: "Excluir",
  ARQUIVAR: "Arquivar",
  RESTAURAR: "Restaurar",
  DESATIVAR: "Desativar",
  REATIVAR: "Reativar",
  RESETAR_SENHA: "Resetar Senha",
  ALTERAR_STATUS: "Alterar Status",
  REGISTRAR_PAGAMENTO: "Registrar Pagamento",
  REGISTRAR_REPASSE: "Registrar Repasse",
  CANCELAR_VENDA: "Cancelar Venda",
};

const ACAO_COLORS: Record<string, string> = {
  CRIAR: "bg-green-100 text-green-800",
  EDITAR: "bg-blue-100 text-blue-800",
  EXCLUIR: "bg-red-100 text-red-800",
  ARQUIVAR: "bg-gray-100 text-gray-800",
  RESTAURAR: "bg-purple-100 text-purple-800",
  DESATIVAR: "bg-red-100 text-red-800",
  REATIVAR: "bg-green-100 text-green-800",
  RESETAR_SENHA: "bg-amber-100 text-amber-800",
  ALTERAR_STATUS: "bg-blue-100 text-blue-800",
  REGISTRAR_PAGAMENTO: "bg-green-100 text-green-800",
  REGISTRAR_REPASSE: "bg-purple-100 text-purple-800",
  CANCELAR_VENDA: "bg-red-100 text-red-800",
};

const ENTIDADE_LABELS: Record<string, string> = {
  PECA: "Peca",
  VENDA: "Venda",
  CLIENTE: "Cliente",
  FORNECEDOR: "Fornecedor",
  USUARIO: "Usuario",
  CONFIGURACAO: "Configuracao",
};

export default function AuditoriaPage() {
  const router = useRouter();

  const [acaoFiltro, setAcaoFiltro] = useState<string | undefined>();
  const [entidadeFiltro, setEntidadeFiltro] = useState<string | undefined>();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);

  const queryOptions = trpc.auditoria.list.queryOptions({
    page,
    limit: 50,
    acao: acaoFiltro as any,
    entidade: entidadeFiltro as any,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });

  const { data, isLoading } = useQuery(queryOptions);

  const { data: stats } = useQuery(trpc.auditoria.getStats.queryOptions());

  const limparFiltros = () => {
    setAcaoFiltro(undefined);
    setEntidadeFiltro(undefined);
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  const temFiltros = acaoFiltro || entidadeFiltro || dataInicio || dataFim;

  const exportarLogs = () => {
    if (!dataInicio || !dataFim) {
      alert("Selecione um periodo para exportar");
      return;
    }
    // Abrir em nova aba para download (simplificado)
    const url = `/api/auditoria/export?dataInicio=${dataInicio}&dataFim=${dataFim}${entidadeFiltro ? `&entidade=${entidadeFiltro}` : ""}`;
    window.open(url, "_blank");
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Auditoria" },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Log de Auditoria</h1>
              <p className="text-muted-foreground">
                {data?.total ?? 0} registro(s) encontrado(s)
              </p>
            </div>
          </div>
        </div>

        {/* Cards de estatisticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.hoje ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Esta Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.semana ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.mes ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 flex-wrap items-end">
          <div className="space-y-1">
            <Label className="text-xs">Acao</Label>
            <Select
              value={acaoFiltro || "all"}
              onValueChange={(value) => {
                setAcaoFiltro(value === "all" ? undefined : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todas as acoes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as acoes</SelectItem>
                <SelectItem value="CRIAR">Criar</SelectItem>
                <SelectItem value="EDITAR">Editar</SelectItem>
                <SelectItem value="EXCLUIR">Excluir</SelectItem>
                <SelectItem value="ARQUIVAR">Arquivar</SelectItem>
                <SelectItem value="RESTAURAR">Restaurar</SelectItem>
                <SelectItem value="ALTERAR_STATUS">Alterar Status</SelectItem>
                <SelectItem value="REGISTRAR_PAGAMENTO">Registrar Pagamento</SelectItem>
                <SelectItem value="CANCELAR_VENDA">Cancelar Venda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Entidade</Label>
            <Select
              value={entidadeFiltro || "all"}
              onValueChange={(value) => {
                setEntidadeFiltro(value === "all" ? undefined : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="PECA">Peca</SelectItem>
                <SelectItem value="VENDA">Venda</SelectItem>
                <SelectItem value="CLIENTE">Cliente</SelectItem>
                <SelectItem value="FORNECEDOR">Fornecedor</SelectItem>
                <SelectItem value="USUARIO">Usuario</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Data Inicio</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
          </div>

          {temFiltros && (
            <Button variant="ghost" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !data || data.logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum registro encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acao</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            ACAO_COLORS[log.acao] || "bg-gray-100 text-gray-800"
                          )}
                        >
                          {ACAO_LABELS[log.acao] || log.acao}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ENTIDADE_LABELS[log.entidade] || log.entidade}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.entidadeId ? log.entidadeId.slice(-8) : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {log.detalhes ? (
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Ver detalhes
                              </Button>
                            </SheetTrigger>
                            <SheetContent>
                              <SheetHeader>
                                <SheetTitle>Detalhes do Log</SheetTitle>
                              </SheetHeader>
                              <div className="mt-6 space-y-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Data/Hora
                                  </Label>
                                  <p className="font-medium">
                                    {formatDateTime(log.createdAt)}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Usuario
                                  </Label>
                                  <p className="font-medium">{log.user.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {log.user.email}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Acao
                                  </Label>
                                  <p className="font-medium">
                                    {ACAO_LABELS[log.acao] || log.acao}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Entidade
                                  </Label>
                                  <p className="font-medium">
                                    {ENTIDADE_LABELS[log.entidade] || log.entidade}
                                  </p>
                                </div>
                                {log.entidadeId && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      ID da Entidade
                                    </Label>
                                    <p className="font-mono text-sm">
                                      {log.entidadeId}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Detalhes
                                  </Label>
                                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                                    {JSON.stringify(
                                      JSON.parse(log.detalhes),
                                      null,
                                      2
                                    )}
                                  </pre>
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Paginacao */}
        {data && data.pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="py-2 px-4">
              Pagina {page} de {data.pages}
            </span>
            <Button
              variant="outline"
              disabled={page === data.pages}
              onClick={() => setPage(page + 1)}
            >
              Proxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
