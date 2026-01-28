import type { NextRequest } from "next/server";

import { auth } from "@gestaomrchrono/auth";
import prisma from "@gestaomrchrono/db";

export async function createContext(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  // Buscar usuário completo com nível de acesso
  let user = null;
  if (session?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        nivel: true,
        ativo: true,
      },
    });
  }

  return {
    session,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
