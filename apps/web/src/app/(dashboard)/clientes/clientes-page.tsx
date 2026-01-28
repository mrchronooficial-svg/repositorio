"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientesTable } from "@/components/tables/clientes-table";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters";

export function ClientesPage() {
  const router = useRouter();
  const { podeVerValores } = usePermissions();

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(
    trpc.cliente.list.queryOptions({
      page,
      limit: 20,
      search: search || undefined,
      tipo: tipo as "PESSOA_FISICA" | "PESSOA_JURIDICA" | undefined,
    })
  );

  const { data: dashboard } = useQuery(trpc.cliente.getDashboard.queryOptions());
  const { data: topClientes } = useQuery(trpc.cliente.getTopClientes.queryOptions());

  const limparFiltros = () => {
    setSearch("");
    setTipo(undefined);
    setPage(1);
  };

  const temFiltros = search || tipo;

  return (
    <div className="space-y-6">
      {/* Dashboard de metricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.totalClientes ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.clientesAtivos ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Com compras</p>
          </CardContent>
        </Card>

        {podeVerValores && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faturamento Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard?.faturamentoTotal
                    ? formatCurrency(dashboard.faturamentoTotal)
                    : "-"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ticket Medio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard?.ticketMedio
                    ? formatCurrency(dashboard.ticketMedio)
                    : "-"}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Top Clientes */}
      {podeVerValores && topClientes && topClientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topClientes.slice(0, 5).map((c, index) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/clientes/${c.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium">{c.nome}</span>
                    <span className="text-sm text-muted-foreground">
                      ({c.totalCompras} compras)
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(c.faturamento)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header e filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {data?.total ?? 0} cliente(s) cadastrado(s)
          </p>
        </div>
        <Button onClick={() => router.push("/clientes/novo")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF/CNPJ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={tipo || "all"}
          onValueChange={(value) => {
            setTipo(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="PESSOA_FISICA">Pessoa Fisica</SelectItem>
            <SelectItem value="PESSOA_JURIDICA">Pessoa Juridica</SelectItem>
          </SelectContent>
        </Select>
        {temFiltros && (
          <Button variant="ghost" onClick={limparFiltros}>
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Tabela */}
      <ClientesTable
        clientes={data?.clientes ?? []}
        isLoading={isLoading}
        podeVerValores={podeVerValores}
        onView={(id) => router.push(`/clientes/${id}`)}
      />

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
  );
}
