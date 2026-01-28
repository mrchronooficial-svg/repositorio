import prisma from "@gestaomrchrono/db";
import { env } from "@gestaomrchrono/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],

  // Incluir campos customizados do usuário na sessão
  user: {
    additionalFields: {
      nivel: {
        type: "string",
        required: false,
      },
      ativo: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },

  // Callback para adicionar dados extras à sessão
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutos
    },
  },
});
