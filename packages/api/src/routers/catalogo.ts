import { z } from "zod";
import { router, publicProcedure } from "../index";
import prisma from "@gestaomrchrono/db";

// ============================================
// CATÁLOGO PÚBLICO — Router (sem autenticação)
// ============================================

const TipoEventoEnum = z.enum([
  "pageview",
  "card_view",
  "click_interesse",
  "click_share",
  "filter_use",
]);

export const catalogoRouter = router({
  // Listar peças para o catálogo (cursor-based pagination)
  listarPecas: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(12),
        marca: z.string().optional(),
        precoMin: z.number().optional(),
        precoMax: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const { cursor, limit, marca, precoMin, precoMax } = input;

      // Peças vendidas há menos de 48h (para mostrar com selo VENDIDO)
      const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const where: Record<string, unknown> = {
        arquivado: false,
        OR: [
          { status: { notIn: ["VENDIDA", "DEFEITO", "PERDA"] } },
          {
            status: "VENDIDA",
            venda: {
              dataVenda: { gte: limite48h },
              cancelada: false,
            },
          },
        ],
      };

      // Filtro de marca
      if (marca) {
        where.marca = { equals: marca, mode: "insensitive" };
      }

      // Filtro de faixa de preço
      if (precoMin !== undefined || precoMax !== undefined) {
        where.valorEstimadoVenda = {
          ...(precoMin !== undefined && { gte: precoMin }),
          ...(precoMax !== undefined && { lte: precoMax }),
        };
      }

      const items = await prisma.peca.findMany({
        where,
        take: limit + 1, // busca 1 a mais para saber se há próxima página
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1, // pula o cursor
        }),
        orderBy: [
          { pinnedInCatalog: "desc" },
          { pinnedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          marca: true,
          modelo: true,
          ano: true,
          tamanhoCaixa: true,
          materialCaixa: true,
          materialPulseira: true,
          valorEstimadoVenda: true,
          status: true,
          pinnedInCatalog: true,
          createdAt: true,
          fotos: {
            orderBy: { ordem: "asc" },
            select: {
              id: true,
              url: true,
              ordem: true,
            },
          },
          venda: {
            select: {
              dataVenda: true,
              cancelada: true,
            },
          },
        },
      });

      // Determinar se há próxima página
      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Buscar peça individual (para página com OG tags)
  getPeca: publicProcedure
    .input(z.object({ pecaId: z.string() }))
    .query(async ({ input }) => {
      const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const peca = await prisma.peca.findFirst({
        where: {
          id: input.pecaId,
          arquivado: false,
          OR: [
            { status: { notIn: ["VENDIDA", "DEFEITO", "PERDA"] } },
            {
              status: "VENDIDA",
              venda: {
                dataVenda: { gte: limite48h },
                cancelada: false,
              },
            },
          ],
        },
        select: {
          id: true,
          marca: true,
          modelo: true,
          ano: true,
          tamanhoCaixa: true,
          materialCaixa: true,
          materialPulseira: true,
          valorEstimadoVenda: true,
          status: true,
          pinnedInCatalog: true,
          createdAt: true,
          fotos: {
            orderBy: { ordem: "asc" },
            select: {
              id: true,
              url: true,
              ordem: true,
            },
          },
          venda: {
            select: {
              dataVenda: true,
              cancelada: true,
            },
          },
        },
      });

      return peca;
    }),

  // Marcas disponíveis no catálogo (para filtro)
  getMarcasDisponiveis: publicProcedure.query(async () => {
    const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const pecas = await prisma.peca.findMany({
      where: {
        arquivado: false,
        OR: [
          { status: { notIn: ["VENDIDA", "DEFEITO", "PERDA"] } },
          {
            status: "VENDIDA",
            venda: {
              dataVenda: { gte: limite48h },
              cancelada: false,
            },
          },
        ],
      },
      select: { marca: true },
      distinct: ["marca"],
      orderBy: { marca: "asc" },
    });

    return pecas.map((p) => p.marca);
  }),

  // Configurações de urgência (para frontend calcular números simulados)
  getConfiguracoes: publicProcedure.query(async () => {
    const configs = await prisma.configuracao.findMany({
      where: {
        chave: { startsWith: "catalogo_urgencia_" },
      },
      select: {
        chave: true,
        valor: true,
      },
    });

    // Retornar como objeto chave-valor
    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.chave] = c.valor;
    }
    return result;
  }),

  // Registrar evento de analytics
  registrarEvento: publicProcedure
    .input(
      z.object({
        tipo: TipoEventoEnum,
        pecaId: z.string().optional(),
        deviceType: z.string().optional(),
        referrer: z.string().optional(),
        metadata: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.catalogoEvento.create({
        data: {
          tipo: input.tipo,
          pecaId: input.pecaId,
          deviceType: input.deviceType,
          referrer: input.referrer,
          metadata: input.metadata,
        },
      });

      return { success: true };
    }),
});
