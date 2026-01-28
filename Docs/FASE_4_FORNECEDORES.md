# FASE 4: Módulo Fornecedores

> Implementar CRUD completo de fornecedores como módulo de referência.

---

## Informações Gerais

| Item | Valor |
|------|-------|
| **Objetivo** | CRUD completo de fornecedores |
| **Pré-requisitos** | Fase 3 concluída (layout e utils) |
| **Complexidade** | Média |
| **Dependência** | Fase 3 |

---

## Checklist de Tarefas

### Backend
- [ ] Criar router `packages/api/src/routers/fornecedor.ts`
- [ ] Criar service `packages/api/src/services/auditoria.service.ts`
- [ ] Atualizar root router

### Frontend
- [ ] Criar página de listagem `/fornecedores`
- [ ] Criar página novo fornecedor `/fornecedores/novo`
- [ ] Criar página detalhes `/fornecedores/[id]`
- [ ] Criar tabela de fornecedores
- [ ] Criar formulário de fornecedor
- [ ] Criar campos de endereço com ViaCEP
- [ ] Criar card de fornecedor

---

## Arquivos a Criar

### Backend

#### 1. Service de Auditoria

**Arquivo:** `packages/api/src/services/auditoria.service.ts`

```typescript
import { prisma } from "@gestaomrchrono/db";

interface RegistrarAuditoriaParams {
  userId: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  detalhes?: Record<string, unknown>;
}

export async function registrarAuditoria({
  userId,
  acao,
  entidade,
  entidadeId,
  detalhes,
}: RegistrarAuditoriaParams): Promise<void> {
  await prisma.auditoria.create({
    data: {
      userId,
      acao,
      entidade,
      entidadeId,
      detalhes: detalhes ? JSON.stringify(detalhes) : null,
    },
  });
}
```

---

#### 2. Router tRPC Fornecedor

**Arquivo:** `packages/api/src/routers/fornecedor.ts`

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, socioOuAdminProcedure, adminProcedure } from "../index";
import { prisma } from "@gestaomrchrono/db";
import { registrarAuditoria } from "../services/auditoria.service";

// Função de validação de CPF/CNPJ
function validarCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  // Implementar validação completa
  return digits.length === 11 || digits.length === 14;
}

// Schemas
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
```

---

#### 3. Atualizar Root Router

**Arquivo:** `packages/api/src/routers/index.ts`

```typescript
import { router } from "../index";
import { fornecedorRouter } from "./fornecedor";

export const appRouter = router({
  fornecedor: fornecedorRouter,
  // outros routers serão adicionados aqui
});

export type AppRouter = typeof appRouter;
```

---

### Frontend

#### 4. Página de Listagem

**Arquivo:** `apps/web/src/app/(dashboard)/fornecedores/page.tsx`

```typescript
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FornecedoresPage } from "./fornecedores-page";

export default function Page() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Fornecedores" }]} />
      <FornecedoresPage />
    </div>
  );
}
```

**Arquivo:** `apps/web/src/app/(dashboard)/fornecedores/fornecedores-page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FornecedoresTable } from "@/components/tables/fornecedores-table";
import { trpc } from "@/utils/trpc";
import { usePermissions } from "@/hooks/use-permissions";

export function FornecedoresPage() {
  const router = useRouter();
  const { podeVerValores } = usePermissions();

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<string | undefined>();
  const [score, setScore] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.fornecedor.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
    tipo: tipo as any,
    score: score as any,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <Button onClick={() => router.push("/fornecedores/novo")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF/CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PESSOA_FISICA">Pessoa Física</SelectItem>
            <SelectItem value="PESSOA_JURIDICA">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
        <Select value={score} onValueChange={setScore}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXCELENTE">Excelente</SelectItem>
            <SelectItem value="BOM">Bom</SelectItem>
            <SelectItem value="REGULAR">Regular</SelectItem>
            <SelectItem value="RUIM">Ruim</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <FornecedoresTable
        fornecedores={data?.fornecedores ?? []}
        isLoading={isLoading}
        podeVerValores={podeVerValores}
        onView={(id) => router.push(`/fornecedores/${id}`)}
      />

      {/* Paginação */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="py-2 px-4">
            Página {page} de {data.pages}
          </span>
          <Button
            variant="outline"
            disabled={page === data.pages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

#### 5. Tabela de Fornecedores

**Arquivo:** `apps/web/src/components/tables/fornecedores-table.tsx`

```typescript
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatCpfCnpj, formatCurrency } from "@/lib/formatters";
import { TIPO_PESSOA_LABELS } from "@/lib/constants";

interface Fornecedor {
  id: string;
  tipo: string;
  nome: string;
  cpfCnpj: string;
  cidade: string;
  estado: string;
  score: string | null;
  _count: {
    pecas: number;
  };
}

interface FornecedoresTableProps {
  fornecedores: Fornecedor[];
  isLoading: boolean;
  podeVerValores: boolean;
  onView: (id: string) => void;
}

export function FornecedoresTable({
  fornecedores,
  isLoading,
  podeVerValores,
  onView,
}: FornecedoresTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (fornecedores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum fornecedor encontrado.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>CPF/CNPJ</TableHead>
          <TableHead>Cidade/UF</TableHead>
          <TableHead>Score</TableHead>
          <TableHead className="text-right">Peças</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fornecedores.map((fornecedor) => (
          <TableRow
            key={fornecedor.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onView(fornecedor.id)}
          >
            <TableCell className="font-medium">{fornecedor.nome}</TableCell>
            <TableCell>{TIPO_PESSOA_LABELS[fornecedor.tipo]}</TableCell>
            <TableCell>{formatCpfCnpj(fornecedor.cpfCnpj)}</TableCell>
            <TableCell>
              {fornecedor.cidade}/{fornecedor.estado}
            </TableCell>
            <TableCell>
              {fornecedor.score ? (
                <StatusBadge type="score" status={fornecedor.score} size="sm" />
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              {fornecedor._count.pecas}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

#### 6. Formulário de Fornecedor

**Arquivo:** `apps/web/src/components/forms/fornecedor-form.tsx`

Arquivo grande - criar com campos de tipo, nome, CPF/CNPJ, telefone, email, e campos de endereço.

---

#### 7. Campos de Endereço

**Arquivo:** `apps/web/src/components/forms/endereco-fields.tsx`

Componente reutilizável com integração ViaCEP para autopreenchimento.

---

## Critérios de Conclusão

| Critério | Status |
|----------|--------|
| Listar fornecedores com filtros | [ ] |
| Paginação funciona | [ ] |
| Criar fornecedor com validação | [ ] |
| Editar fornecedor | [ ] |
| Arquivar fornecedor (soft delete) | [ ] |
| Busca por CPF/CNPJ funciona | [ ] |
| Integração ViaCEP funciona | [ ] |
| Funcionário NÃO vê volumes em R$ | [ ] |
| Auditoria registrada | [ ] |

---

## Próxima Fase

Após concluir esta fase, seguir para **FASE 5: Módulo Estoque/Peças**.

---

*Atualizar este documento conforme progresso*
