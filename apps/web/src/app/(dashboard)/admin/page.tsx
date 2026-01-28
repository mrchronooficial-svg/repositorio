import { headers } from "next/headers";
import { auth } from "@gestaomrchrono/auth";
import prisma from "@gestaomrchrono/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Verificar se é admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nivel: true },
  });

  if (user?.nivel !== "ADMINISTRADOR") {
    redirect("/dashboard");
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin" }]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">
          Configurações e gerenciamento do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>Gerenciar usuários do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Criar, editar e desativar usuários.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parâmetros</CardTitle>
            <CardDescription>Configurações do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Taxa MDR, lead time, metas e localizações.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auditoria</CardTitle>
            <CardDescription>Log de ações</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Histórico de ações realizadas no sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
