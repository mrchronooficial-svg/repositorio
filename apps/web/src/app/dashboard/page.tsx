import { auth } from "@gestaomrchrono/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@gestaomrchrono/db";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Buscar dados completos do usuário incluindo nível
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      nivel: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return <Dashboard user={user} />;
}
