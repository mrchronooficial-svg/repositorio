import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

// Procedure protegido - requer autenticação
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar logado para acessar este recurso",
    });
  }

  // Verificar se usuário está ativo
  if (!ctx.user.ativo) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sua conta está desativada. Entre em contato com o administrador.",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  });
});

// Procedure para Admin apenas
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.nivel !== "ADMINISTRADOR") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem acessar este recurso",
    });
  }
  return next({ ctx });
});

// Procedure para Admin ou Sócio (pode ver valores)
export const socioOuAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para acessar este recurso",
    });
  }
  return next({ ctx });
});
