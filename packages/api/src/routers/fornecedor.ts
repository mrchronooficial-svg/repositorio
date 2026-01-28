import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, socioOuAdminProcedure, adminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";

// Validação de CPF
function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digits[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digits[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digits[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digits[10])) return false;

  return true;
}

// Validação de CNPJ
function validarCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(digits[i]) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(digits[12])) return false;

  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(digits[i]) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(digits[13])) return false;

  return true;
}

function validarCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return validarCPF(digits);
  if (digits.length === 14) return validarCNPJ(digits);
  return false;
}

// Schemas de validação
const FornecedorCreateSchema = z.object({
  tipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]),
  nome: z.string().min(1, "Nome é obrigatório"),
  cpfCnpj: z.string().refine(validarCpfCnpj, "CPF/CNPJ inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email().optional().or(z.literal("")),
  cep: z.string().length(8, "CEP deve ter 8 dígitos"),
  rua: z.string().min(1, "Rua é obrigatória"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
  score: z.enum(["EXCELENTE", "BOM", "REGULAR", "RUIM"]).optional(),
});

const FornecedorUpdateSchema = FornecedorCreateSchema.partial().extend({
  id: z.string().cuid(),
});

const FornecedorListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  tipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]).optional(),
  score: z.enum(["EXCELENTE", "BOM", "REGULAR", "RUIM"]).optional(),
  arquivado: z.boolean().default(false),
});

export const fornecedorRouter = router({
  // Listar fornecedores
  list: protectedProcedure
    .input(FornecedorListSchema)
    .query(async ({ input }) => {
      const { page, limit, search, tipo, score, arquivado } = input;
      const skip = (page - 1) * limit;

      const where = {
        arquivado,
        ...(tipo && { tipo }),
        ...(score && { score }),
        ...(search && {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { cpfCnpj: { contains: search } },
          ],
        }),
      };

      const [fornecedores, total] = await Promise.all([
        prisma.fornecedor.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { pecas: true },
            },
          },
        }),
        prisma.fornecedor.count({ where }),
      ]);

      return {
        fornecedores,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Buscar por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const fornecedor = await prisma.fornecedor.findUnique({
        where: { id: input.id },
        include: {
          pecas: {
            where: { arquivado: false },
            select: {
              id: true,
              sku: true,
              marca: true,
              modelo: true,
              status: true,
              valorCompra: true,
            },
          },
        },
      });

      if (!fornecedor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fornecedor não encontrado",
        });
      }

      // Calcular métricas
      const metricas = {
        totalPecas: fornecedor.pecas.length,
        pecasEmEstoque: fornecedor.pecas.filter(
          (p) => ["DISPONIVEL", "EM_TRANSITO", "REVISAO"].includes(p.status)
        ).length,
        pecasVendidas: fornecedor.pecas.filter(
          (p) => p.status === "VENDIDA"
        ).length,
        volumeTransacionado: fornecedor.pecas.reduce(
          (acc, p) => acc + Number(p.valorCompra),
          0
        ),
      };

      // Ocultar volume se for funcionário
      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

      return {
        ...fornecedor,
        _metricas: {
          ...metricas,
          volumeTransacionado: podeVerValores ? metricas.volumeTransacionado : null,
        },
      };
    }),

  // Buscar por CPF/CNPJ
  getByCpfCnpj: protectedProcedure
    .input(z.object({ cpfCnpj: z.string() }))
    .query(async ({ input }) => {
      const digits = input.cpfCnpj.replace(/\D/g, "");
      const fornecedor = await prisma.fornecedor.findUnique({
        where: { cpfCnpj: digits },
      });
      return fornecedor;
    }),

  // Criar fornecedor
  create: protectedProcedure
    .input(FornecedorCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const cpfCnpjDigits = input.cpfCnpj.replace(/\D/g, "");

      // Verificar duplicidade
      const existe = await prisma.fornecedor.findUnique({
        where: { cpfCnpj: cpfCnpjDigits },
      });

      if (existe) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "CPF/CNPJ já cadastrado",
        });
      }

      const fornecedor = await prisma.fornecedor.create({
        data: {
          ...input,
          cpfCnpj: cpfCnpjDigits,
          email: input.email || null,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "FORNECEDOR",
        entidadeId: fornecedor.id,
        detalhes: { nome: fornecedor.nome },
      });

      return fornecedor;
    }),

  // Atualizar fornecedor
  update: protectedProcedure
    .input(FornecedorUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      // Verificar se fornecedor existe
      const existente = await prisma.fornecedor.findUnique({
        where: { id },
      });

      if (!existente) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fornecedor não encontrado",
        });
      }

      // Se mudou CPF/CNPJ, verificar duplicidade
      if (data.cpfCnpj) {
        const cpfCnpjDigits = data.cpfCnpj.replace(/\D/g, "");
        if (cpfCnpjDigits !== existente.cpfCnpj) {
          const duplicado = await prisma.fornecedor.findUnique({
            where: { cpfCnpj: cpfCnpjDigits },
          });
          if (duplicado) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "CPF/CNPJ já cadastrado para outro fornecedor",
            });
          }
        }
      }

      const fornecedor = await prisma.fornecedor.update({
        where: { id },
        data: {
          ...data,
          cpfCnpj: data.cpfCnpj?.replace(/\D/g, ""),
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "FORNECEDOR",
        entidadeId: fornecedor.id,
      });

      return fornecedor;
    }),

  // Arquivar fornecedor (soft delete)
  archive: socioOuAdminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const fornecedor = await prisma.fornecedor.update({
        where: { id: input.id },
        data: { arquivado: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ARQUIVAR",
        entidade: "FORNECEDOR",
        entidadeId: fornecedor.id,
      });

      return fornecedor;
    }),

  // Restaurar fornecedor
  restore: socioOuAdminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const fornecedor = await prisma.fornecedor.update({
        where: { id: input.id },
        data: { arquivado: false },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "RESTAURAR",
        entidade: "FORNECEDOR",
        entidadeId: fornecedor.id,
      });

      return fornecedor;
    }),

  // Excluir fornecedor (permanente)
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verificar se tem peças vinculadas
      const pecas = await prisma.peca.count({
        where: { fornecedorId: input.id },
      });

      if (pecas > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Não é possível excluir fornecedor com peças vinculadas",
        });
      }

      await prisma.fornecedor.delete({
        where: { id: input.id },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EXCLUIR",
        entidade: "FORNECEDOR",
        entidadeId: input.id,
      });

      return { success: true };
    }),
});
