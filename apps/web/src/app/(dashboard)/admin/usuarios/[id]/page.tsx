"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, UserX, UserCheck, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { trpc } from "@/utils/trpc";
import { NIVEL_ACESSO_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function EditarUsuarioPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const id = params.id as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nivel, setNivel] = useState<"ADMINISTRADOR" | "SOCIO" | "FUNCIONARIO">(
    "FUNCIONARIO"
  );

  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const queryOptions = trpc.admin.getUserById.queryOptions({ id });
  const { data: user, isLoading } = useQuery({
    ...queryOptions,
    enabled: !!id,
  });

  // Preencher formulario quando usuario carregar
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setNivel(user.nivel);
    }
  }, [user]);

  const updateMutation = useMutation(
    trpc.admin.updateUser.mutationOptions({
      onSuccess: () => {
        toast.success("Usuario atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deactivateMutation = useMutation(
    trpc.admin.deactivateUser.mutationOptions({
      onSuccess: () => {
        toast.success("Usuario desativado com sucesso");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const activateMutation = useMutation(
    trpc.admin.activateUser.mutationOptions({
      onSuccess: () => {
        toast.success("Usuario reativado com sucesso");
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const resetPasswordMutation = useMutation(
    trpc.admin.resetPassword.mutationOptions({
      onSuccess: () => {
        toast.success("Senha alterada com sucesso");
        setResetPasswordDialogOpen(false);
        setNewPassword("");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !nivel) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }

    updateMutation.mutate({
      id,
      name,
      email,
      nivel,
    });
  };

  const handleResetPassword = () => {
    if (!newPassword) return;
    resetPasswordMutation.mutate({
      userId: id,
      newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Usuario nao encontrado</h2>
        <Button
          variant="link"
          onClick={() => router.push("/admin/usuarios")}
          className="mt-4"
        >
          Voltar para listagem
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Usuarios", href: "/admin/usuarios" },
          { label: user.name },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/usuarios")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.name}</h1>
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
              </div>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialogOpen(true)}
            >
              <Key className="h-4 w-4 mr-2" />
              Resetar Senha
            </Button>
            {user.ativo ? (
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    confirm("Tem certeza que deseja desativar este usuario?")
                  ) {
                    deactivateMutation.mutate({ id });
                  }
                }}
                disabled={deactivateMutation.isPending}
              >
                <UserX className="h-4 w-4 mr-2" />
                Desativar
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => activateMutation.mutate({ id })}
                disabled={activateMutation.isPending}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Reativar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Usuario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome completo"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nivel">Nivel de Acesso *</Label>
                    <Select
                      value={nivel}
                      onValueChange={(value) =>
                        setNivel(
                          value as "ADMINISTRADOR" | "SOCIO" | "FUNCIONARIO"
                        )
                      }
                    >
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FUNCIONARIO">Funcionario</SelectItem>
                        <SelectItem value="SOCIO">Socio</SelectItem>
                        <SelectItem value="ADMINISTRADOR">
                          Administrador
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/admin/usuarios")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Informacoes */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informacoes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nivel Atual</p>
                  <p className="font-medium">
                    {NIVEL_ACESSO_LABELS[user.nivel]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-medium">{formatDateTime(user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ultimo Acesso</p>
                  <p className="font-medium">
                    {user.ultimoAcesso
                      ? formatDateTime(user.ultimoAcesso)
                      : "Nunca"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atividade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Acoes de Auditoria</p>
                  <p className="text-2xl font-bold">
                    {user._count.auditorias}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alteracoes de Status</p>
                  <p className="text-2xl font-bold">
                    {user._count.historicoStatus}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
