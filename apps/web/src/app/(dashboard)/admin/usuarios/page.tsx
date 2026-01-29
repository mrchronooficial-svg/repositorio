"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  UserX,
  UserCheck,
  Key,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { NIVEL_ACESSO_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function UsuariosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState<string | undefined>();
  const [ativoFiltro, setAtivoFiltro] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const queryOptions = trpc.admin.listUsers.queryOptions({
    page,
    limit: 20,
    search: search || undefined,
    nivel: nivelFiltro as "ADMINISTRADOR" | "SOCIO" | "FUNCIONARIO" | undefined,
    ativo: ativoFiltro === undefined ? undefined : ativoFiltro === "true",
  });

  const { data, isLoading } = useQuery(queryOptions);

  const deactivateMutation = useMutation({
    ...trpc.admin.deactivateUser.mutationOptions(),
    onSuccess: () => {
      toast.success("Usuario desativado com sucesso");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const activateMutation = useMutation({
    ...trpc.admin.activateUser.mutationOptions(),
    onSuccess: () => {
      toast.success("Usuario reativado com sucesso");
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = useMutation({
    ...trpc.admin.resetPassword.mutationOptions(),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso");
      setResetPasswordDialogOpen(false);
      setSelectedUserId(null);
      setNewPassword("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const limparFiltros = () => {
    setSearch("");
    setNivelFiltro(undefined);
    setAtivoFiltro(undefined);
    setPage(1);
  };

  const temFiltros = search || nivelFiltro || ativoFiltro;

  const handleResetPassword = () => {
    if (!selectedUserId || !newPassword) return;
    resetPasswordMutation.mutate({
      userId: selectedUserId,
      newPassword,
    });
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Usuarios" },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <p className="text-muted-foreground">
              {data?.total ?? 0} usuario(s) cadastrado(s)
            </p>
          </div>
          <Button onClick={() => router.push("/admin/usuarios/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuario
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={nivelFiltro || "all"}
            onValueChange={(value) => {
              setNivelFiltro(value === "all" ? undefined : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os niveis</SelectItem>
              <SelectItem value="ADMINISTRADOR">Administrador</SelectItem>
              <SelectItem value="SOCIO">Socio</SelectItem>
              <SelectItem value="FUNCIONARIO">Funcionario</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={ativoFiltro ?? "all"}
            onValueChange={(value) => {
              setAtivoFiltro(value === "all" ? undefined : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Ativos</SelectItem>
              <SelectItem value="false">Inativos</SelectItem>
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
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !data || data.users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum usuario encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ultimo Acesso</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            user.nivel === "ADMINISTRADOR" &&
                              "bg-purple-100 text-purple-800",
                            user.nivel === "SOCIO" &&
                              "bg-blue-100 text-blue-800",
                            user.nivel === "FUNCIONARIO" &&
                              "bg-gray-100 text-gray-800"
                          )}
                        >
                          {NIVEL_ACESSO_LABELS[user.nivel]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            user.ativo
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {user.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.ultimoAcesso
                          ? formatDateTime(user.ultimoAcesso)
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/admin/usuarios/${user.id}`)
                              }
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setResetPasswordDialogOpen(true);
                              }}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Resetar Senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.ativo ? (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Tem certeza que deseja desativar este usuario?"
                                    )
                                  ) {
                                    deactivateMutation.mutate({ id: user.id });
                                  }
                                }}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() =>
                                  activateMutation.mutate({ id: user.id })
                                }
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Reativar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Dialog de reset de senha */}
      <Dialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 8 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setNewPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={
                !newPassword ||
                newPassword.length < 8 ||
                resetPasswordMutation.isPending
              }
            >
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
