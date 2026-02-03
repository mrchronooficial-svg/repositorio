import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, socioOuAdminProcedure, adminProcedure } from "../index";
import prisma from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";

// Validacao de CPF
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

// Validacao de CNPJ
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

// Schemas
const ClienteCreateSchema = z.object({
  tipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]),
  nome: z.string().min(1, "Nome e obrigatorio"),
  cpfCnpj: z.string().refine(validarCpfCnpj, "CPF/CNPJ invalido"),
  dataNascimento: z.string().optional(), // ISO date string
  telefone: z.string().min(10, "Telefone invalido"),
  email: z.string().email().optional().or(z.literal("")),
  cep: z.string().length(8, "CEP deve ter 8 digitos"),
  rua: z.string().min(1, "Rua e obrigatoria"),
  numero: z.string().min(1, "Numero e obrigatorio"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro e obrigatorio"),
  cidade: z.string().min(1, "Cidade e obrigatoria"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
});

const ClienteUpdateSchema = ClienteCreateSchema.partial().extend({
  id: z.string().cuid(),
});

const ClienteListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  tipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]).optional(),
  arquivado: z.boolean().default(false),
});

export const clienteRouter = router({
  // Listar clientes com metricas
  list: protectedProcedure
    .input(ClienteListSchema)
    .query(async ({ input, ctx }) => {
      const { page, limit, search, tipo, arquivado } = input;
      const skip = (page - 1) * limit;

      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

      const where = {
        arquivado,
        ...(tipo && { tipo }),
        ...(search && {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { cpfCnpj: { contains: search } },
          ],
        }),
      };

      const [clientes, total] = await Promise.all([
        prisma.cliente.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            vendas: {
              where: { cancelada: false },
              select: {
                valorFinal: true,
                valorRepasseDevido: true,
                dataVenda: true,
              },
            },
          },
        }),
        prisma.cliente.count({ where }),
      ]);

      // Calcular metricas por cliente
      const clientesComMetricas = clientes.map((cliente) => {
        const totalCompras = cliente.vendas.length;
        // Faturamento real: consignação = margem (valorFinal - valorRepasseDevido)
        const faturamento = cliente.vendas.reduce((acc, v) => {
          const valorFinal = Number(v.valorFinal) || 0;
          const valorRepasse = Number(v.valorRepasseDevido) || 0;
          return acc + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
        }, 0);

        return {
          ...cliente,
          vendas: undefined, // Remover vendas do retorno
          _metricas: {
            totalCompras,
            faturamento: podeVerValores ? faturamento : null,
          },
        };
      });

      return {
        clientes: clientesComMetricas,
        total,
        pages: Math.ceil(total / limit),
        page,
      };
    }),

  // Buscar por ID com metricas completas
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

      const cliente = await prisma.cliente.findUnique({
        where: { id: input.id },
        include: {
          vendas: {
            where: { cancelada: false },
            orderBy: { dataVenda: "desc" },
            include: {
              peca: {
                select: {
                  sku: true,
                  marca: true,
                  modelo: true,
                  valorCompra: true,
                  origemTipo: true,
                },
              },
            },
          },
        },
      });

      if (!cliente) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente nao encontrado",
        });
      }

      // Calcular metricas
      const totalCompras = cliente.vendas.length;
      // Faturamento real: consignação = margem (valorFinal - valorRepasseDevido)
      const faturamento = cliente.vendas.reduce((acc, v) => {
        const valorFinal = Number(v.valorFinal) || 0;
        const valorRepasse = Number(v.valorRepasseDevido) || 0;
        return acc + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
      }, 0);

      // LTV = soma dos lucros reais
      // - Compra: valorFinal - valorCompra
      // - Consignacao: valorFinal - valorRepasseDevido (margem)
      const ltv = cliente.vendas.reduce((acc, v) => {
        const valorFinal = Number(v.valorFinal) || 0;
        const valorRepasse = Number(v.valorRepasseDevido) || 0;
        const valorCompra = Number(v.peca.valorCompra) || 0;
        // Se tem repasse, é consignação: lucro = margem
        const lucro = valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal - valorCompra;
        return acc + lucro;
      }, 0);

      // Tempo como cliente
      const primeiraCompra = cliente.vendas[cliente.vendas.length - 1]?.dataVenda;
      const tempoComoCliente = primeiraCompra
        ? Math.floor(
            (Date.now() - new Date(primeiraCompra).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      // Recorrencia (compras por mes)
      const meses = tempoComoCliente / 30 || 1;
      const recorrencia = totalCompras / meses;

      return {
        ...cliente,
        vendas: cliente.vendas.map((v) => ({
          ...v,
          valorFinal: podeVerValores ? v.valorFinal : null,
          peca: {
            ...v.peca,
            valorCompra: podeVerValores ? v.peca.valorCompra : null,
          },
        })),
        _metricas: {
          totalCompras,
          faturamento: podeVerValores ? faturamento : null,
          ltv: podeVerValores ? ltv : null,
          tempoComoCliente,
          recorrencia: parseFloat(recorrencia.toFixed(2)),
        },
      };
    }),

  // Buscar por CPF/CNPJ
  getByCpfCnpj: protectedProcedure
    .input(z.object({ cpfCnpj: z.string() }))
    .query(async ({ input }) => {
      const digits = input.cpfCnpj.replace(/\D/g, "");
      const cliente = await prisma.cliente.findUnique({
        where: { cpfCnpj: digits },
      });
      return cliente;
    }),

  // Criar cliente
  create: protectedProcedure
    .input(ClienteCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const cpfCnpjDigits = input.cpfCnpj.replace(/\D/g, "");

      // Verificar duplicidade
      const existe = await prisma.cliente.findUnique({
        where: { cpfCnpj: cpfCnpjDigits },
      });

      if (existe) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "CPF/CNPJ ja cadastrado",
        });
      }

      // Validar data nascimento se PF
      if (input.tipo === "PESSOA_FISICA" && !input.dataNascimento) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Data de nascimento e obrigatoria para pessoa fisica",
        });
      }

      const cliente = await prisma.cliente.create({
        data: {
          ...input,
          cpfCnpj: cpfCnpjDigits,
          dataNascimento: input.dataNascimento
            ? new Date(input.dataNascimento)
            : null,
          email: input.email || null,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "CRIAR",
        entidade: "CLIENTE",
        entidadeId: cliente.id,
        detalhes: { nome: cliente.nome },
      });

      return cliente;
    }),

  // Atualizar cliente
  update: protectedProcedure
    .input(ClienteUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const existente = await prisma.cliente.findUnique({
        where: { id },
      });

      if (!existente) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente nao encontrado",
        });
      }

      // Se mudou CPF/CNPJ, verificar duplicidade
      if (data.cpfCnpj) {
        const cpfCnpjDigits = data.cpfCnpj.replace(/\D/g, "");
        if (cpfCnpjDigits !== existente.cpfCnpj) {
          const duplicado = await prisma.cliente.findUnique({
            where: { cpfCnpj: cpfCnpjDigits },
          });
          if (duplicado) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "CPF/CNPJ ja cadastrado para outro cliente",
            });
          }
        }
      }

      const cliente = await prisma.cliente.update({
        where: { id },
        data: {
          ...data,
          cpfCnpj: data.cpfCnpj?.replace(/\D/g, ""),
          dataNascimento: data.dataNascimento
            ? new Date(data.dataNascimento)
            : undefined,
        },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "EDITAR",
        entidade: "CLIENTE",
        entidadeId: cliente.id,
      });

      return cliente;
    }),

  // Arquivar cliente
  archive: socioOuAdminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const cliente = await prisma.cliente.update({
        where: { id: input.id },
        data: { arquivado: true },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "ARQUIVAR",
        entidade: "CLIENTE",
        entidadeId: cliente.id,
      });

      return cliente;
    }),

  // Restaurar cliente
  restore: socioOuAdminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      const cliente = await prisma.cliente.update({
        where: { id: input.id },
        data: { arquivado: false },
      });

      await registrarAuditoria({
        userId: ctx.user.id,
        acao: "RESTAURAR",
        entidade: "CLIENTE",
        entidadeId: cliente.id,
      });

      return cliente;
    }),

  // Top 10 clientes por faturamento
  getTopClientes: protectedProcedure.query(async ({ ctx }) => {
    const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

    if (!podeVerValores) {
      return [];
    }

    const clientes = await prisma.cliente.findMany({
      where: { arquivado: false },
      include: {
        vendas: {
          where: { cancelada: false },
          select: { valorFinal: true, valorRepasseDevido: true },
        },
      },
    });

    const clientesComFaturamento = clientes
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        // Faturamento real: consignação = margem
        faturamento: c.vendas.reduce((acc, v) => {
          const valorFinal = Number(v.valorFinal) || 0;
          const valorRepasse = Number(v.valorRepasseDevido) || 0;
          return acc + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
        }, 0),
        totalCompras: c.vendas.length,
      }))
      .filter((c) => c.totalCompras > 0)
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10);

    return clientesComFaturamento;
  }),

  // Dashboard de clientes
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const podeVerValores = ["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel);

    const [totalClientes, clientesAtivos] = await Promise.all([
      prisma.cliente.count({ where: { arquivado: false } }),
      prisma.cliente.count({
        where: {
          arquivado: false,
          vendas: { some: { cancelada: false } },
        },
      }),
    ]);

    let faturamentoTotal = null;
    let ticketMedio = null;

    if (podeVerValores) {
      const vendas = await prisma.venda.findMany({
        where: { cancelada: false },
        select: { valorFinal: true, valorRepasseDevido: true },
      });

      // Faturamento real: consignação = margem
      faturamentoTotal = vendas.reduce((acc, v) => {
        const valorFinal = Number(v.valorFinal) || 0;
        const valorRepasse = Number(v.valorRepasseDevido) || 0;
        return acc + (valorRepasse > 0 ? valorFinal - valorRepasse : valorFinal);
      }, 0);
      ticketMedio = vendas.length > 0 ? faturamentoTotal / vendas.length : 0;
    }

    return {
      totalClientes,
      clientesAtivos,
      faturamentoTotal,
      ticketMedio,
    };
  }),
});
