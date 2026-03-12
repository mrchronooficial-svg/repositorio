import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, socioOuAdminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";

// ============================================
// DROP DO DIA — Router
// ============================================

/**
 * Converte date (ISO) + launchTime (HH:MM) em horário UTC.
 * Brasília = UTC-3, então soma 3 horas ao horário local.
 */
function computeLaunchDateTime(date: string, launchTime: string): Date {
  const [hours, minutes] = launchTime.split(":").map(Number);
  const d = new Date(date);
  d.setUTCHours(hours! + 3, minutes!, 0, 0);
  return d;
}

export const dropRouter = router({
  // ============================================
  // PUBLIC — getCurrent
  // ============================================
  getCurrent: publicProcedure.query(async () => {
    const now = new Date();

    // 1. Lazy transition: SCHEDULED → ACTIVE (launchDateTime <= now)
    await prisma.drop.updateMany({
      where: {
        status: "SCHEDULED",
        launchDateTime: { lte: now },
      },
      data: { status: "ACTIVE" },
    });

    // 2. Lazy transition: ACTIVE → COMPLETED (all items SOLD)
    const activeDrops = await prisma.drop.findMany({
      where: { status: "ACTIVE" },
      include: { items: { select: { status: true } } },
    });

    for (const drop of activeDrops) {
      if (drop.items.length > 0 && drop.items.every((item) => item.status === "SOLD")) {
        await prisma.drop.update({
          where: { id: drop.id },
          data: { status: "COMPLETED" },
        });
      }
    }

    const pecaSelect = {
      id: true,
      sku: true,
      marca: true,
      modelo: true,
      ano: true,
      tamanhoCaixa: true,
      materialCaixa: true,
      materialPulseira: true,
      valorEstimadoVenda: true,
      fotos: {
        select: { id: true, url: true, ordem: true },
        orderBy: { ordem: "asc" as const },
      },
    };

    // 3. Return active drop
    const activeDrop = await prisma.drop.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { launchDateTime: "desc" },
      include: {
        items: {
          include: {
            peca: { select: pecaSelect },
          },
        },
      },
    });

    // Helper: get next scheduled drop for countdown
    async function getNextScheduled() {
      return prisma.drop.findFirst({
        where: { status: "SCHEDULED" },
        orderBy: { launchDateTime: "asc" },
        select: {
          id: true,
          launchDateTime: true,
          launchTime: true,
          viewersBase: true,
          messagesBase: true,
        },
      });
    }

    if (activeDrop) {
      const nextDrop = await getNextScheduled();
      return { drop: activeDrop, nextDrop };
    }

    // 4. Return next scheduled drop (for countdown)
    const scheduledDrop = await getNextScheduled();

    if (scheduledDrop) {
      return { drop: null, nextDrop: scheduledDrop };
    }

    // 5. Return last completed drop
    const completedDrop = await prisma.drop.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { launchDateTime: "desc" },
      include: {
        items: {
          include: {
            peca: { select: pecaSelect },
          },
        },
      },
    });

    if (completedDrop) {
      const nextDrop = await getNextScheduled();
      return { drop: completedDrop, nextDrop };
    }

    // 6. Nothing
    return { drop: null, nextDrop: null };
  }),

  // ============================================
  // ADMIN — list
  // ============================================
  list: socioOuAdminProcedure.query(async () => {
    const pecaSummary = {
      id: true,
      sku: true,
      marca: true,
      modelo: true,
      fotos: {
        select: { id: true, url: true },
        orderBy: { ordem: "asc" as const },
        take: 1,
      },
    };

    const [active, scheduled, paused, history] = await Promise.all([
      prisma.drop.findMany({
        where: { status: "ACTIVE" },
        orderBy: { launchDateTime: "desc" },
        include: {
          items: {
            include: { peca: { select: pecaSummary } },
          },
        },
      }),
      prisma.drop.findMany({
        where: { status: "SCHEDULED" },
        orderBy: { launchDateTime: "asc" },
        include: {
          items: {
            include: { peca: { select: pecaSummary } },
          },
        },
      }),
      prisma.drop.findMany({
        where: { status: "PAUSED" },
        orderBy: { launchDateTime: "desc" },
        include: {
          items: {
            include: { peca: { select: pecaSummary } },
          },
        },
      }),
      prisma.drop.findMany({
        where: { status: "COMPLETED" },
        orderBy: { launchDateTime: "desc" },
        take: 20,
        include: {
          items: {
            include: { peca: { select: pecaSummary } },
          },
        },
      }),
    ]);

    return { active, scheduled, paused, history };
  }),

  // ============================================
  // ADMIN — create
  // ============================================
  create: socioOuAdminProcedure
    .input(
      z.object({
        date: z.string(),
        launchTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM esperado"),
        viewersBase: z.number().int().min(0),
        messagesBase: z.number().int().min(0),
        items: z
          .array(
            z.object({
              pecaId: z.string(),
              dropPrice: z.number().positive("Preço deve ser positivo"),
            })
          )
          .min(1, "Mínimo 1 item")
          .max(3, "Máximo 3 itens"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const launchDateTime = computeLaunchDateTime(input.date, input.launchTime);

      // Validate: launchDateTime must be in the future
      if (launchDateTime <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A data/hora de lançamento deve ser no futuro",
        });
      }

      // Validate: no conflict with existing SCHEDULED/ACTIVE drop at same datetime
      const conflict = await prisma.drop.findFirst({
        where: {
          status: { in: ["SCHEDULED", "ACTIVE"] },
          launchDateTime,
        },
      });

      if (conflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe um drop agendado para esta data e horário",
        });
      }

      // Validate: each peca exists and is not in another SCHEDULED/ACTIVE drop
      const pecaIds = input.items.map((i) => i.pecaId);

      const pecas = await prisma.peca.findMany({
        where: { id: { in: pecaIds } },
        select: { id: true, valorEstimadoVenda: true },
      });

      if (pecas.length !== pecaIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Uma ou mais peças não foram encontradas",
        });
      }

      const pecasEmDrop = await prisma.dropItem.findMany({
        where: {
          pecaId: { in: pecaIds },
          drop: { status: { in: ["SCHEDULED", "ACTIVE"] } },
        },
        select: { pecaId: true },
      });

      if (pecasEmDrop.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Uma ou mais peças já estão em um drop ativo ou agendado",
        });
      }

      const pecaMap = new Map(pecas.map((p) => [p.id, p]));

      const drop = await prisma.drop.create({
        data: {
          date: new Date(input.date),
          launchTime: input.launchTime,
          launchDateTime,
          status: "SCHEDULED",
          viewersBase: input.viewersBase,
          messagesBase: input.messagesBase,
          items: {
            create: input.items.map((item) => ({
              pecaId: item.pecaId,
              dropPrice: item.dropPrice,
              originalPrice: pecaMap.get(item.pecaId)!.valorEstimadoVenda,
              status: "AVAILABLE",
            })),
          },
        },
        include: { items: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "DROP",
        entidadeId: drop.id,
        detalhes: {
          date: input.date,
          launchTime: input.launchTime,
          itemCount: input.items.length,
        },
      });

      return drop;
    }),

  // ============================================
  // ADMIN — update
  // ============================================
  update: socioOuAdminProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.string().optional(),
        launchTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, "Formato HH:MM esperado")
          .optional(),
        viewersBase: z.number().int().min(0).optional(),
        messagesBase: z.number().int().min(0).optional(),
        items: z
          .array(
            z.object({
              pecaId: z.string(),
              dropPrice: z.number().positive("Preço deve ser positivo"),
            })
          )
          .min(1, "Mínimo 1 item")
          .max(3, "Máximo 3 itens")
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.drop.findUnique({
        where: { id: input.id },
        include: { items: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Drop não encontrado",
        });
      }

      if (existing.status !== "SCHEDULED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas drops agendados podem ser editados",
        });
      }

      // Compute new launchDateTime if date or time changed
      const newDate = input.date ?? existing.date.toISOString().split("T")[0]!;
      const newTime = input.launchTime ?? existing.launchTime;
      const launchDateTime = computeLaunchDateTime(newDate, newTime);

      if (launchDateTime <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A data/hora de lançamento deve ser no futuro",
        });
      }

      // Check conflict (exclude self)
      const conflict = await prisma.drop.findFirst({
        where: {
          id: { not: input.id },
          status: { in: ["SCHEDULED", "ACTIVE"] },
          launchDateTime,
        },
      });

      if (conflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe um drop agendado para esta data e horário",
        });
      }

      // If items provided, validate and recreate
      if (input.items) {
        const pecaIds = input.items.map((i) => i.pecaId);

        const pecas = await prisma.peca.findMany({
          where: { id: { in: pecaIds } },
          select: { id: true, valorEstimadoVenda: true },
        });

        if (pecas.length !== pecaIds.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Uma ou mais peças não foram encontradas",
          });
        }

        // Check peca conflicts (exclude items from this drop)
        const pecasEmDrop = await prisma.dropItem.findMany({
          where: {
            pecaId: { in: pecaIds },
            dropId: { not: input.id },
            drop: { status: { in: ["SCHEDULED", "ACTIVE"] } },
          },
          select: { pecaId: true },
        });

        if (pecasEmDrop.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Uma ou mais peças já estão em um drop ativo ou agendado",
          });
        }

        const pecaMap = new Map(pecas.map((p) => [p.id, p]));

        // Delete existing items and recreate
        await prisma.dropItem.deleteMany({
          where: { dropId: input.id },
        });

        await prisma.dropItem.createMany({
          data: input.items.map((item) => ({
            dropId: input.id,
            pecaId: item.pecaId,
            dropPrice: item.dropPrice,
            originalPrice: pecaMap.get(item.pecaId)!.valorEstimadoVenda,
            status: "AVAILABLE" as const,
          })),
        });
      }

      const drop = await prisma.drop.update({
        where: { id: input.id },
        data: {
          date: new Date(newDate),
          launchTime: newTime,
          launchDateTime,
          ...(input.viewersBase !== undefined && { viewersBase: input.viewersBase }),
          ...(input.messagesBase !== undefined && { messagesBase: input.messagesBase }),
        },
        include: { items: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "DROP",
        entidadeId: drop.id,
        detalhes: {
          date: newDate,
          launchTime: newTime,
          itemsUpdated: !!input.items,
        },
      });

      return drop;
    }),

  // ============================================
  // ADMIN — pause (ACTIVE → PAUSED)
  // ============================================
  pause: socioOuAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.drop.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Drop não encontrado",
        });
      }

      if (existing.status !== "ACTIVE" && existing.status !== "SCHEDULED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas drops ativos ou agendados podem ser pausados",
        });
      }

      const drop = await prisma.drop.update({
        where: { id: input.id },
        data: { status: "PAUSED" },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "PAUSAR",
        entidade: "DROP",
        entidadeId: input.id,
        detalhes: { previousStatus: existing.status },
      });

      return drop;
    }),

  // ============================================
  // ADMIN — resume (PAUSED → ACTIVE)
  // ============================================
  resume: socioOuAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.drop.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Drop não encontrado",
        });
      }

      if (existing.status !== "PAUSED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas drops pausados podem ser retomados",
        });
      }

      const drop = await prisma.drop.update({
        where: { id: input.id },
        data: { status: "ACTIVE" },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "RETOMAR",
        entidade: "DROP",
        entidadeId: input.id,
      });

      return drop;
    }),

  // ============================================
  // ADMIN — delete
  // ============================================
  delete: socioOuAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.drop.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Drop não encontrado",
        });
      }

      if (existing.status === "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Drops concluídos não podem ser excluídos",
        });
      }

      await prisma.drop.delete({
        where: { id: input.id },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EXCLUIR",
        entidade: "DROP",
        entidadeId: input.id,
      });

      return { success: true };
    }),

  // ============================================
  // ADMIN — markItemSold
  // ============================================
  markItemSold: socioOuAdminProcedure
    .input(
      z.object({
        dropItemId: z.string(),
        vendaId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const item = await prisma.dropItem.findUnique({
        where: { id: input.dropItemId },
        include: { drop: true },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item do drop não encontrado",
        });
      }

      if (item.status === "SOLD") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este item já foi vendido",
        });
      }

      await prisma.dropItem.update({
        where: { id: input.dropItemId },
        data: {
          status: "SOLD",
          soldAt: new Date(),
          vendaId: input.vendaId,
        },
      });

      // Check if all items of this drop are now SOLD
      const remainingAvailable = await prisma.dropItem.count({
        where: {
          dropId: item.dropId,
          status: "AVAILABLE",
        },
      });

      if (remainingAvailable === 0) {
        await prisma.drop.update({
          where: { id: item.dropId },
          data: { status: "COMPLETED" },
        });
      }

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "VENDER_ITEM",
        entidade: "DROP",
        entidadeId: item.dropId,
        detalhes: {
          dropItemId: input.dropItemId,
          vendaId: input.vendaId,
          pecaId: item.pecaId,
        },
      });

      return { success: true };
    }),
});
