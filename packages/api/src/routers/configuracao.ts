import { z } from "zod";
import { protectedProcedure, router } from "../index";
import prisma from "@gestaomrchrono/db";

// Chaves de configuracao do sistema
const CHAVES_CONFIGURACAO = [
  "TAXA_MDR",
  "LEAD_TIME_DIAS",
  "META_VENDAS_SEMANAL",
  "ALERTA_DIAS_RELOJOEIRO",
  "dias_alerta_envio",
  "ALIQUOTA_SIMPLES",
  "CAPITAL_SOCIAL",
] as const;

type ChaveConfiguracao = (typeof CHAVES_CONFIGURACAO)[number];

// Valores padrao
const VALORES_PADRAO: Record<ChaveConfiguracao, string> = {
  TAXA_MDR: "4",
  LEAD_TIME_DIAS: "20",
  META_VENDAS_SEMANAL: "10",
  ALERTA_DIAS_RELOJOEIRO: "14",
  dias_alerta_envio: "3",
  ALIQUOTA_SIMPLES: "auto",
  CAPITAL_SOCIAL: "70273.40",
};

export const configuracaoRouter = router({
  // Buscar todas as configuracoes
  getAll: protectedProcedure.query(async () => {
    const configs = await prisma.configuracao.findMany();

    // Criar mapa com valores do banco
    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.chave] = c.valor;
    });

    // Retornar todas as chaves com valores (do banco ou padrao)
    const resultado: Record<ChaveConfiguracao, string> = {} as Record<
      ChaveConfiguracao,
      string
    >;
    for (const chave of CHAVES_CONFIGURACAO) {
      resultado[chave] = configMap[chave] || VALORES_PADRAO[chave];
    }

    return resultado;
  }),

  // Buscar uma configuracao especifica
  get: protectedProcedure
    .input(z.object({ chave: z.string() }))
    .query(async ({ input }) => {
      const config = await prisma.configuracao.findUnique({
        where: { chave: input.chave },
      });

      if (config) {
        return config.valor;
      }

      // Retornar valor padrao se existir
      const chave = input.chave as ChaveConfiguracao;
      if (chave in VALORES_PADRAO) {
        return VALORES_PADRAO[chave];
      }

      return null;
    }),

  // Atualizar configuracao (apenas ADMINISTRADOR)
  update: protectedProcedure
    .input(
      z.object({
        chave: z.enum(CHAVES_CONFIGURACAO),
        valor: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissao
      if (ctx.session.user.nivel !== "ADMINISTRADOR") {
        throw new Error("Apenas administradores podem alterar configuracoes");
      }

      // Validar valores especificos
      if (input.chave === "TAXA_MDR") {
        const taxa = parseFloat(input.valor);
        if (isNaN(taxa) || taxa < 0 || taxa > 100) {
          throw new Error("Taxa MDR deve ser um numero entre 0 e 100");
        }
      }

      if (input.chave === "ALIQUOTA_SIMPLES") {
        if (input.valor !== "auto") {
          const taxa = parseFloat(input.valor);
          if (isNaN(taxa) || taxa < 0 || taxa > 100) {
            throw new Error("Aliquota do Simples deve ser 'auto' ou um numero entre 0 e 100");
          }
        }
      }

      if (
        input.chave === "LEAD_TIME_DIAS" ||
        input.chave === "META_VENDAS_SEMANAL" ||
        input.chave === "ALERTA_DIAS_RELOJOEIRO"
      ) {
        const valor = parseInt(input.valor);
        if (isNaN(valor) || valor < 1) {
          throw new Error("Valor deve ser um numero inteiro maior que zero");
        }
      }

      if (input.chave === "CAPITAL_SOCIAL") {
        const valor = parseFloat(input.valor);
        if (isNaN(valor) || valor < 0) {
          throw new Error("Capital Social deve ser um valor monetario positivo");
        }
      }

      // Upsert da configuracao
      await prisma.configuracao.upsert({
        where: { chave: input.chave },
        update: { valor: input.valor },
        create: { chave: input.chave, valor: input.valor },
      });

      return { success: true };
    }),

  // Atualizar varias configuracoes de uma vez (apenas ADMINISTRADOR)
  updateMany: protectedProcedure
    .input(
      z.object({
        configuracoes: z.array(
          z.object({
            chave: z.enum(CHAVES_CONFIGURACAO),
            valor: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissao
      if (ctx.session.user.nivel !== "ADMINISTRADOR") {
        throw new Error("Apenas administradores podem alterar configuracoes");
      }

      // Atualizar cada configuracao
      for (const config of input.configuracoes) {
        await prisma.configuracao.upsert({
          where: { chave: config.chave },
          update: { valor: config.valor },
          create: { chave: config.chave, valor: config.valor },
        });
      }

      return { success: true };
    }),

  // Resetar para valores padrao (apenas ADMINISTRADOR)
  resetToDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    // Verificar permissao
    if (ctx.session.user.nivel !== "ADMINISTRADOR") {
      throw new Error("Apenas administradores podem resetar configuracoes");
    }

    // Deletar todas as configuracoes (voltam ao padrao)
    await prisma.configuracao.deleteMany();

    return { success: true };
  }),
});
