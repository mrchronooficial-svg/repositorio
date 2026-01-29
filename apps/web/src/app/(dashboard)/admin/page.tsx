import { headers } from "next/headers";
import { auth } from "@gestaomrchrono/auth";
import prisma from "@gestaomrchrono/db";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AdminPage as AdminPageClient } from "./admin-page";

export default async function Page() {
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
      <AdminPageClient />
    </div>
  );
}
