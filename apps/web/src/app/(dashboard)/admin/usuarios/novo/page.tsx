"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

export default function NovoUsuarioPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nivel, setNivel] = useState<"ADMINISTRADOR" | "SOCIO" | "FUNCIONARIO">(
    "FUNCIONARIO"
  );
  const [showPassword, setShowPassword] = useState(false);

  const createMutation = useMutation(
    trpc.admin.createUser.mutationOptions({
      onSuccess: () => {
        toast.success("Usuario criado com sucesso!");
        router.push("/admin/usuarios");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !nivel) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }

    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    createMutation.mutate({
      name,
      email,
      password,
      nivel,
    });
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Usuarios", href: "/admin/usuarios" },
          { label: "Novo Usuario" },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/usuarios")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Novo Usuario</h1>
            <p className="text-muted-foreground">
              Crie um novo usuario para o sistema
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <Card className="max-w-2xl">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimo 8 caracteres"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
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
                    <SelectTrigger>
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
              </div>

              {/* Descricao dos niveis */}
              <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                <p className="font-medium">Niveis de Acesso:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <strong>Funcionario:</strong> Acesso limitado, sem visualizacao de valores
                  </li>
                  <li>
                    <strong>Socio:</strong> Acesso total aos dados, exceto painel admin
                  </li>
                  <li>
                    <strong>Administrador:</strong> Acesso total, incluindo gestao de usuarios
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/usuarios")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? "Criando..." : "Criar Usuario"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
