"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

type NivelAcesso = "ADMINISTRADOR" | "SOCIO" | "FUNCIONARIO";

interface User {
  id: string;
  name: string;
  email: string;
  nivel: NivelAcesso;
}

const nivelLabels: Record<NivelAcesso, string> = {
  ADMINISTRADOR: "Administrador",
  SOCIO: "Sócio",
  FUNCIONARIO: "Funcionário",
};

export default function Dashboard({ user }: { user: User }) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Logout realizado com sucesso");
          router.push("/login");
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Mr. Chrono</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{nivelLabels[user.nivel]}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Bem-vindo ao sistema de gestão</p>
        </div>

        {/* Cards de navegação */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Estoque</CardTitle>
              <CardDescription>Gerenciar peças e relógios</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">peças disponíveis</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Vendas</CardTitle>
              <CardDescription>Registrar e acompanhar vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">vendas este mês</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>Base de clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">clientes cadastrados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Fornecedores</CardTitle>
              <CardDescription>Gerenciar fornecedores</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">fornecedores ativos</p>
            </CardContent>
          </Card>

          {user.nivel === "ADMINISTRADOR" && (
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Painel Admin</CardTitle>
                <CardDescription>Configurações do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Gerenciar usuários, parâmetros e auditoria
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info do usuário */}
        <div className="mt-8 p-4 bg-white rounded-lg border">
          <h3 className="font-medium mb-2">Informações da Sessão</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Nível de Acesso:</strong> {nivelLabels[user.nivel]}</p>
            <p><strong>ID:</strong> {user.id}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
