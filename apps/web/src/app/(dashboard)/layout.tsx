import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@gestaomrchrono/auth";
import prisma from "@gestaomrchrono/db";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Buscar dados completos do usuário
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <div className="flex">
        <Sidebar userLevel={user.nivel} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
