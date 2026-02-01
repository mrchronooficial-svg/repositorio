import { z } from "zod";
import { protectedProcedure, router } from "../index";
import prisma from "@gestaomrchrono/db";

export const utensilioRouter = router({
  // Listar todos os utensílios
  list: protectedProcedure.query(async () => {
    const utensilios = await prisma.utensilio.findMany({
      orderBy: { nome: "asc" },
    });
    return utensilios;
  }),

  // Adicionar quantidade a um utensílio
  adicionarQuantidade: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        quantidade: z.number().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const utensilio = await prisma.utensilio.update({
        where: { id: input.id },
        data: {
          quantidade: { increment: input.quantidade },
        },
      });
      return utensilio;
    }),

  // Atualizar quantidade mínima de um utensílio
  atualizarQuantidadeMinima: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        quantidadeMinima: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const utensilio = await prisma.utensilio.update({
        where: { id: input.id },
        data: { quantidadeMinima: input.quantidadeMinima },
      });
      return utensilio;
    }),

  // Criar utensílio (usado internamente ou pelo seed)
  criar: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        quantidade: z.number().min(0).default(0),
        quantidadeMinima: z.number().min(0).default(5),
      })
    )
    .mutation(async ({ input }) => {
      const utensilio = await prisma.utensilio.create({
        data: input,
      });
      return utensilio;
    }),

  // Subtrair quantidade (usado quando envia uma peça)
  subtrairQuantidade: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        quantidade: z.number().min(1).default(1),
      })
    )
    .mutation(async ({ input }) => {
      const utensilio = await prisma.utensilio.update({
        where: { id: input.id },
        data: {
          quantidade: { decrement: input.quantidade },
        },
      });
      return utensilio;
    }),

  // Subtrair 1 de todos os utensílios (quando uma venda é enviada)
  subtrairTodos: protectedProcedure.mutation(async () => {
    await prisma.utensilio.updateMany({
      where: { quantidade: { gt: 0 } },
      data: {
        quantidade: { decrement: 1 },
      },
    });
    return { success: true };
  }),

  // Verificar se algum utensílio está abaixo do mínimo
  verificarEstoqueBaixo: protectedProcedure.query(async () => {
    const utensilios = await prisma.utensilio.findMany();
    const emBaixa = utensilios.filter(
      (u) => u.quantidade <= u.quantidadeMinima
    );
    return {
      total: utensilios.length,
      emBaixa: emBaixa.length,
      itens: emBaixa,
    };
  }),

  // Inicializar utensílios padrão (se não existirem)
  inicializar: protectedProcedure.mutation(async () => {
    const utensiliosPadrao = [
      { nome: "Caixa de papelão", quantidade: 0, quantidadeMinima: 5 },
      { nome: "Caixa de plástico", quantidade: 0, quantidadeMinima: 5 },
      { nome: "Envelope", quantidade: 0, quantidadeMinima: 10 },
      { nome: "Cartão garantia", quantidade: 0, quantidadeMinima: 10 },
      { nome: "Pano", quantidade: 0, quantidadeMinima: 10 },
    ];

    for (const utensilio of utensiliosPadrao) {
      await prisma.utensilio.upsert({
        where: { nome: utensilio.nome },
        update: {},
        create: utensilio,
      });
    }

    return { success: true, message: "Utensílios inicializados" };
  }),
});
