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

  // Extrair IP do cliente (suporta proxy/edge: x-forwarded-for, x-real-ip)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  return {
    session,
    user,
    ip,
    userAgent: req.headers.get("user-agent") || null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
