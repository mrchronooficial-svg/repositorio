import { z } from "zod";
import { protectedProcedure, router } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";

// Verificar se usuario e admin
function assertAdmin(nivel: string) {
  if (nivel !== "ADMINISTRADOR") {
    throw new Error("Acesso negado. Apenas administradores podem acessar esta funcao.");
  }
}

export const adminRouter = router({
  // Listar usuarios
  listUsers: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        nivel: z.enum(["ADMINISTRADOR", "SOCIO", "FUNCIONARIO"]).optional(),
        ativo: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const { page, limit, search, nivel, ativo } = input;
      const skip = (page - 1) * limit;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(nivel && { nivel }),
        ...(ativo !== undefined && { ativo }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            nivel: true,
            ativo: true,
            createdAt: true,
            ultimoAcesso: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        pages: Math.ceil(total / limit),
      };
    }),

  // Buscar usuario por ID
  getUserById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          nivel: true,
          ativo: true,
          createdAt: true,
          ultimoAcesso: true,
          _count: {
            select: {
              auditorias: true,
              historicoStatus: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("Usuario nao encontrado");
      }

      return user;
    }),

  // Criar usuario
  createUser: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("Email invalido"),
        password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
        nivel: z.enum(["ADMINISTRADOR", "SOCIO", "FUNCIONARIO"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      // Verificar se email ja existe
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new Error("Ja existe um usuario com este email");
      }

      // Hash da senha usando bcrypt (via Better Auth)
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Gerar ID unico
      const { randomUUID } = await import("crypto");
      const userId = randomUUID();

      // Criar usuario
      const user = await prisma.user.create({
        data: {
          id: userId,
          name: input.name,
          email: input.email,
          nivel: input.nivel,
          ativo: true,
          emailVerified: true, // Usuario criado pelo admin ja esta verificado
        },
      });

      // Criar account com senha
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId: userId,
          password: hashedPassword,
        },
      });

      await registrarAuditoria({
        userId: ctx.session.user.id,
        acao: "CRIAR",
        entidade: "USUARIO",
        entidadeId: user.id,
        detalhes: JSON.stringify({ nome: input.name, email: input.email, nivel: input.nivel }),
      });

      return user;
    }),

  // Atualizar usuario
  updateUser: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        nivel: z.enum(["ADMINISTRADOR", "SOCIO", "FUNCIONARIO"]).optional(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const { id, ...data } = input;

      // Verificar se usuario existe
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new Error("Usuario nao encontrado");
      }

      // Nao permitir desativar o proprio usuario
      if (id === ctx.session.user.id && data.ativo === false) {
        throw new Error("Voce nao pode desativar seu proprio usuario");
      }

      // Nao permitir rebaixar o proprio nivel
      if (id === ctx.session.user.id && data.nivel && data.nivel !== "ADMINISTRADOR") {
        throw new Error("Voce nao pode alterar seu proprio nivel de acesso");
      }

      // Verificar se email ja existe (se estiver alterando)
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: data.email },
        });
        if (emailExists) {
          throw new Error("Ja existe um usuario com este email");
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data,
      });

      await registrarAuditoria({
        userId: ctx.session.user.id,
        acao: "EDITAR",
        entidade: "USUARIO",
        entidadeId: user.id,
        detalhes: JSON.stringify(data),
      });

      return user;
    }),

  // Resetar senha do usuario
  resetPassword: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        newPassword: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      // Verificar se usuario existe
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new Error("Usuario nao encontrado");
      }

      // Hash da nova senha
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Atualizar senha na account
      await prisma.account.updateMany({
        where: {
          userId: input.userId,
          providerId: "credential",
        },
        data: {
          password: hashedPassword,
        },
      });

      await registrarAuditoria({
        userId: ctx.session.user.id,
        acao: "RESETAR_SENHA",
        entidade: "USUARIO",
        entidadeId: input.userId,
      });

      return { success: true };
    }),

  // Desativar usuario
  deactivateUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      // Nao permitir desativar o proprio usuario
      if (input.id === ctx.session.user.id) {
        throw new Error("Voce nao pode desativar seu proprio usuario");
      }

      const user = await prisma.user.update({
        where: { id: input.id },
        data: { ativo: false },
      });

      // Invalidar todas as sessoes do usuario
      await prisma.session.deleteMany({
        where: { userId: input.id },
      });

      await registrarAuditoria({
        userId: ctx.session.user.id,
        acao: "DESATIVAR",
        entidade: "USUARIO",
        entidadeId: input.id,
      });

      return user;
    }),

  // Reativar usuario
  activateUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session.user.nivel);

      const user = await prisma.user.update({
        where: { id: input.id },
        data: { ativo: true },
      });

      await registrarAuditoria({
        userId: ctx.session.user.id,
        acao: "REATIVAR",
        entidade: "USUARIO",
        entidadeId: input.id,
      });

      return user;
    }),

  // Estatisticas do sistema
  getStats: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx.session.user.nivel);

    const [
      totalUsers,
      activeUsers,
      totalPecas,
      totalVendas,
      totalClientes,
      totalFornecedores,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { ativo: true } }),
      prisma.peca.count({ where: { arquivado: false } }),
      prisma.venda.count({ where: { cancelada: false } }),
      prisma.cliente.count({ where: { arquivado: false } }),
      prisma.fornecedor.count({ where: { arquivado: false } }),
    ]);

    return {
      usuarios: { total: totalUsers, ativos: activeUsers },
      pecas: totalPecas,
      vendas: totalVendas,
      clientes: totalClientes,
      fornecedores: totalFornecedores,
    };
  }),
});
