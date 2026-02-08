import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, socioOuAdminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";

// ============================================
// CATÁLOGO ADMIN — Router (protegido, Admin/Sócio)
// ============================================

export const catalogoAdminRouter = router({
  // Toggle fixar/desfixar peça no catálogo
  togglePin: socioOuAdminProcedure
    .input(
      z.object({
        pecaId: z.string().cuid("Peça inválida"),
        pinned: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const peca = await prisma.peca.findUnique({
        where: { id: input.pecaId },
      });

      if (!peca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Peça não encontrada",
        });
      }

      await prisma.peca.update({
        where: { id: input.pecaId },
        data: {
          pinnedInCatalog: input.pinned,
          pinnedAt: input.pinned ? new Date() : null,
        },
      });

      return { success: true };
    }),

  // Listar peças disponíveis para fixar no catálogo
  getPecasParaFixar: socioOuAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const search = input?.search;

      const pecas = await prisma.peca.findMany({
        where: {
          arquivado: false,
          status: "DISPONIVEL",
          ...(search && {
            OR: [
              { marca: { contains: search, mode: "insensitive" as const } },
              { modelo: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
            ],
          }),
        },
        orderBy: [
          { pinnedInCatalog: "desc" },
          { pinnedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          sku: true,
          marca: true,
          modelo: true,
          ano: true,
          valorEstimadoVenda: true,
          pinnedInCatalog: true,
          pinnedAt: true,
          fotos: {
            take: 1,
            orderBy: { ordem: "asc" },
            select: { url: true },
          },
        },
      });

      return pecas;
    }),

  // Buscar configurações de urgência do catálogo
  getConfiguracoes: socioOuAdminProcedure.query(async () => {
    const configs = await prisma.configuracao.findMany({
      where: {
        chave: { startsWith: "catalogo_urgencia_" },
      },
      orderBy: { chave: "asc" },
      select: {
        id: true,
        chave: true,
        valor: true,
      },
    });

    return configs;
  }),

  // Atualizar configuração de urgência
  updateConfiguracao: socioOuAdminProcedure
    .input(
      z.object({
        chave: z.string().refine(
          (val) => val.startsWith("catalogo_urgencia_"),
          "Apenas configurações do catálogo podem ser atualizadas"
        ),
        valor: z.string().min(1, "Valor obrigatório"),
      })
    )
    .mutation(async ({ input }) => {
      const config = await prisma.configuracao.findUnique({
        where: { chave: input.chave },
      });

      if (!config) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Configuração "${input.chave}" não encontrada`,
        });
      }

      await prisma.configuracao.update({
        where: { chave: input.chave },
        data: { valor: input.valor },
      });

      return { success: true };
    }),

  // Atualizar múltiplas configurações de urgência de uma vez
  updateConfiguracoes: socioOuAdminProcedure
    .input(
      z.object({
        configuracoes: z.array(
          z.object({
            chave: z.string().refine(
              (val) => val.startsWith("catalogo_urgencia_"),
              "Apenas configurações do catálogo podem ser atualizadas"
            ),
            valor: z.string().refine(
              (val) => {
                const num = parseInt(val, 10);
                return !isNaN(num) && num >= 0 && String(num) === val;
              },
              "Valor deve ser um número inteiro positivo"
            ),
          })
        ).min(1, "Pelo menos uma configuração é obrigatória"),
      })
    )
    .mutation(async ({ input }) => {
      for (const config of input.configuracoes) {
        await prisma.configuracao.upsert({
          where: { chave: config.chave },
          update: { valor: config.valor },
          create: { chave: config.chave, valor: config.valor },
        });
      }

      return { success: true, count: input.configuracoes.length };
    }),

  // Dashboard de analytics do catálogo
  getAnalytics: socioOuAdminProcedure
    .input(
      z.object({
        periodo: z.enum(["hoje", "7dias", "30dias"]),
      })
    )
    .query(async ({ input }) => {
      // Calcular data de início do período
      const agora = new Date();
      let dataInicio: Date;

      switch (input.periodo) {
        case "hoje":
          dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
          break;
        case "7dias":
          dataInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30dias":
          dataInicio = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const wherePeriodo = { createdAt: { gte: dataInicio } };

      // Buscar contagens por tipo em paralelo
      const [
        totalPageviews,
        totalCliquesInteresse,
        totalCompartilhamentos,
        totalCardViews,
        dispositivosMobile,
        dispositivosDesktop,
        topPecasVisualizadas,
        topPecasInteresse,
      ] = await Promise.all([
        // Total pageviews
        prisma.catalogoEvento.count({
          where: { ...wherePeriodo, tipo: "pageview" },
        }),
        // Total cliques interesse
        prisma.catalogoEvento.count({
          where: { ...wherePeriodo, tipo: "click_interesse" },
        }),
        // Total compartilhamentos
        prisma.catalogoEvento.count({
          where: { ...wherePeriodo, tipo: "click_share" },
        }),
        // Total card views
        prisma.catalogoEvento.count({
          where: { ...wherePeriodo, tipo: "card_view" },
        }),
        // Mobile
        prisma.catalogoEvento.count({
          where: { ...wherePeriodo, deviceType: "mobile" },
        }),
        // Desktop
        prisma.catalogoEvento.count({
          where: { ...wherePeriodo, deviceType: "desktop" },
        }),
        // Top 10 peças mais visualizadas (card_view)
        prisma.catalogoEvento.groupBy({
          by: ["pecaId"],
          where: {
            ...wherePeriodo,
            tipo: "card_view",
            pecaId: { not: null },
          },
          _count: { pecaId: true },
          orderBy: { _count: { pecaId: "desc" } },
          take: 10,
        }),
        // Top 10 peças com mais cliques interesse
        prisma.catalogoEvento.groupBy({
          by: ["pecaId"],
          where: {
            ...wherePeriodo,
            tipo: "click_interesse",
            pecaId: { not: null },
          },
          _count: { pecaId: true },
          orderBy: { _count: { pecaId: "desc" } },
          take: 10,
        }),
      ]);

      // Buscar dados das peças do ranking
      const pecaIds = [
        ...new Set([
          ...topPecasVisualizadas.map((p) => p.pecaId).filter(Boolean),
          ...topPecasInteresse.map((p) => p.pecaId).filter(Boolean),
        ]),
      ] as string[];

      const pecasMap = new Map<string, { marca: string; modelo: string; sku: string; fotoUrl: string | null }>();

      if (pecaIds.length > 0) {
        const pecas = await prisma.peca.findMany({
          where: { id: { in: pecaIds } },
          select: {
            id: true,
            marca: true,
            modelo: true,
            sku: true,
            fotos: { take: 1, orderBy: { ordem: "asc" }, select: { url: true } },
          },
        });

        for (const p of pecas) {
          pecasMap.set(p.id, {
            marca: p.marca,
            modelo: p.modelo,
            sku: p.sku,
            fotoUrl: p.fotos[0]?.url ?? null,
          });
        }
      }

      // Montar rankings com dados das peças
      const rankingVisualizadas = topPecasVisualizadas.map((item) => ({
        pecaId: item.pecaId!,
        count: item._count.pecaId,
        ...pecasMap.get(item.pecaId!),
      }));

      const rankingInteresse = topPecasInteresse.map((item) => ({
        pecaId: item.pecaId!,
        count: item._count.pecaId,
        ...pecasMap.get(item.pecaId!),
      }));

      // Percentual mobile vs desktop
      const totalDispositivos = dispositivosMobile + dispositivosDesktop;
      const percentualMobile = totalDispositivos > 0
        ? Math.round((dispositivosMobile / totalDispositivos) * 100)
        : 0;
      const percentualDesktop = totalDispositivos > 0
        ? Math.round((dispositivosDesktop / totalDispositivos) * 100)
        : 0;

      return {
        totalPageviews,
        totalCliquesInteresse,
        totalCompartilhamentos,
        totalCardViews,
        percentualMobile,
        percentualDesktop,
        rankingVisualizadas,
        rankingInteresse,
      };
    }),
});
