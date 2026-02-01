"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Settings,
  FileText,
  ArrowRight,
  Package,
  ShoppingCart,
  UserCheck,
  Truck,
  Box,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

export function AdminPage() {
  const router = useRouter();

  const { data: stats, isLoading } = useQuery(
    trpc.admin.getStats.queryOptions()
  );

  const { data: auditoriaStats } = useQuery(
    trpc.auditoria.getStats.queryOptions()
  );

  const { data: utensilios } = useQuery(
    trpc.utensilio.list.queryOptions()
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Titulo */}
      <div>
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">
          Gerencie usuarios, parametros e visualize logs do sistema
        </p>
      </div>

      {/* Cards de navegacao */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Usuarios */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push("/admin/usuarios")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-lg">Usuarios</CardTitle>
            <CardDescription className="mt-1">
              Gerenciar usuarios do sistema
            </CardDescription>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold">{stats?.usuarios.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.usuarios.ativos ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parametros */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push("/admin/parametros")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-lg">Parametros</CardTitle>
            <CardDescription className="mt-1">
              Configuracoes do sistema
            </CardDescription>
            <div className="mt-4 text-sm text-muted-foreground space-y-1">
              <p>Taxa MDR, Lead Time</p>
              <p>Meta de Vendas, Alertas</p>
            </div>
          </CardContent>
        </Card>

        {/* Auditoria */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push("/admin/auditoria")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-lg">Auditoria</CardTitle>
            <CardDescription className="mt-1">
              Log de acoes do sistema
            </CardDescription>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold">{auditoriaStats?.hoje ?? 0}</p>
                <p className="text-xs text-muted-foreground">hoje</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{auditoriaStats?.semana ?? 0}</p>
                <p className="text-xs text-muted-foreground">semana</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{auditoriaStats?.mes ?? 0}</p>
                <p className="text-xs text-muted-foreground">mes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Utensilios */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push("/admin/utensilios")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Box className="h-5 w-5 text-green-600" />
            </div>
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-lg">Utensilios</CardTitle>
            <CardDescription className="mt-1">
              Materiais de embalagem
            </CardDescription>
            <div className="mt-4">
              {utensilios && utensilios.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold">{utensilios.length}</p>
                    <p className="text-xs text-muted-foreground">tipos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">
                      {utensilios.filter((u) => u.quantidade <= u.quantidadeMinima).length}
                    </p>
                    <p className="text-xs text-muted-foreground">em baixa</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nao configurado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatisticas do sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Estatisticas do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pecas ?? 0}</p>
                <p className="text-sm text-muted-foreground">Pecas</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.vendas ?? 0}</p>
                <p className="text-sm text-muted-foreground">Vendas</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.clientes ?? 0}</p>
                <p className="text-sm text-muted-foreground">Clientes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.fornecedores ?? 0}</p>
                <p className="text-sm text-muted-foreground">Fornecedores</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top usuarios por atividade */}
      {auditoriaStats?.topUsuarios && auditoriaStats.topUsuarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usuarios Mais Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditoriaStats.topUsuarios.map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{user.userName}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {user.count} acoes
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
