# Documentação de API - Sistema Mr. Chrono

> Documentação completa dos routers tRPC, procedures e schemas de validação.

---

## 1. Estrutura Geral

### 1.1 Root Router

```typescript
// packages/server/src/routers/index.ts
import { router } from '../trpc'
import { pecaRouter } from './peca'
import { fornecedorRouter } from './fornecedor'
import { clienteRouter } from './cliente'
import { vendaRouter } from './venda'
import { dashboardRouter } from './dashboard'
import { adminRouter } from './admin'
import { alertaRouter } from './alerta'

export const appRouter = router({
  peca: pecaRouter,
  fornecedor: fornecedorRouter,
  cliente: clienteRouter,
  venda: vendaRouter,
  dashboard: dashboardRouter,
  admin: adminRouter,
  alerta: alertaRouter,
})

export type AppRouter = typeof appRouter
```

### 1.2 Context

```typescript
// packages/server/src/context.ts
export interface Context {
  session: Session | null
  user: User | null
  prisma: PrismaClient
}
```

---

## 2. Router: Peça

### 2.1 Schemas

```typescript
// Schemas Zod para validação

const PecaCreateSchema = z.object({
  marca: z.string().min(1, "Marca é obrigatória"),
  modelo: z.string().min(1, "Modelo é obrigatório"),
  ano: z.number().int().min(1900).max(2100).optional(),
  tamanhoCaixa: z.number().positive("Tamanho deve ser positivo"),
  materialCaixa: z.string().optional(),
  materialPulseira: z.string().optional(),
  valorCompra: z.number().positive("Valor deve ser positivo"),
  valorEstimadoVenda: z.number().positive("Valor deve ser positivo"),
  origemTipo: z.enum(["COMPRA", "CONSIGNACAO"]),
  origemCanal: z.enum(["PESSOA_FISICA", "LEILAO_BRASIL", "EBAY"]).optional(),
  valorRepasse: z.number().positive().optional(),
  localizacao: z.string().min(1),
  fornecedorId: z.string().cuid(),
  fotos: z.array(z.string().url()).min(1, "Mínimo 1 foto obrigatória"),
})

const PecaUpdateSchema = PecaCreateSchema.partial().extend({
  id: z.string().cuid(),
})

const PecaStatusUpdateSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["DISPONIVEL", "EM_TRANSITO", "REVISAO", "DEFEITO", "PERDA"]),
  localizacao: z.string().optional(),
})

const PecaListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  status: z.enum(["DISPONIVEL", "EM_TRANSITO", "REVISAO", "VENDIDA", "DEFEITO", "PERDA"]).optional(),
  localizacao: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  search: z.string().optional(), // Busca por SKU
})
```

### 2.2 Procedures

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista peças com filtros e paginação | Todos |
| `getById` | Query | Busca peça por ID | Todos |
| `getBySku` | Query | Busca peça por SKU | Todos |
| `create` | Mutation | Cadastra nova peça | Todos |
| `update` | Mutation | Atualiza dados da peça | Todos (vendida: Admin/Sócio) |
| `updateStatus` | Mutation | Altera status/localização | Todos |
| `archive` | Mutation | Arquiva peça (soft delete) | Admin/Sócio |
| `delete` | Mutation | Exclui peça permanentemente | Admin |
| `getHistorico` | Query | Retorna histórico de status | Todos |

### 2.3 Exemplos de Uso

```typescript
// Frontend - Listar peças disponíveis
const { data, isLoading } = trpc.peca.list.useQuery({
  status: "DISPONIVEL",
  page: 1,
  limit: 20,
})

// Frontend - Cadastrar peça
const createPeca = trpc.peca.create.useMutation()
await createPeca.mutateAsync({
  marca: "Rolex",
  modelo: "Submariner",
  tamanhoCaixa: 40,
  valorCompra: 50000,
  valorEstimadoVenda: 75000,
  origemTipo: "COMPRA",
  origemCanal: "PESSOA_FISICA",
  localizacao: "Rafael",
  fornecedorId: "clxyz123...",
  fotos: ["https://..."],
})
```

---

## 3. Router: Fornecedor

### 3.1 Schemas

```typescript
const FornecedorCreateSchema = z.object({
  tipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]),
  nome: z.string().min(1, "Nome é obrigatório"),
  cpfCnpj: z.string().refine(validarCpfCnpj, "CPF/CNPJ inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email().optional().or(z.literal("")),
  cep: z.string().length(8, "CEP inválido"),
  rua: z.string().min(1),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  bairro: z.string().min(1),
  cidade: z.string().min(1),
  estado: z.string().length(2),
  score: z.enum(["EXCELENTE", "BOM", "REGULAR", "RUIM"]).optional(),
})

const FornecedorListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  tipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]).optional(),
  score: z.enum(["EXCELENTE", "BOM", "REGULAR", "RUIM"]).optional(),
  search: z.string().optional(), // Busca por nome ou CPF/CNPJ
})
```

### 3.2 Procedures

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista fornecedores | Todos |
| `getById` | Query | Busca por ID com métricas | Todos |
| `getByCpfCnpj` | Query | Busca por CPF/CNPJ | Todos |
| `create` | Mutation | Cadastra fornecedor | Todos |
| `update` | Mutation | Atualiza dados | Todos |
| `archive` | Mutation | Arquiva (soft delete) | Admin/Sócio |
| `delete` | Mutation | Exclui permanentemente | Admin |
| `getMetricas` | Query | Retorna métricas consolidadas | Admin/Sócio |
| `getPecas` | Query | Lista peças do fornecedor | Todos |

### 3.3 Retorno com Métricas

```typescript
// getById retorna:
{
  id: string
  tipo: "PESSOA_FISICA" | "PESSOA_JURIDICA"
  nome: string
  cpfCnpj: string
  // ... outros campos
  _metricas: {
    totalPecas: number
    volumeTransacionado: number // R$ - só Admin/Sócio
    pecasEmEstoque: number
    pecasVendidas: number
  }
}
```

---

## 4. Router: Cliente

### 4.1 Schemas

```typescript
const ClienteCreateSchema = z.object({
  tipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]),
  nome: z.string().min(1, "Nome é obrigatório"),
  cpfCnpj: z.string().refine(validarCpfCnpj, "CPF/CNPJ inválido"),
  dataNascimento: z.date().optional(), // Obrigatório se PF
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email().optional().or(z.literal("")),
  cep: z.string().length(8, "CEP inválido"),
  rua: z.string().min(1),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  bairro: z.string().min(1),
  cidade: z.string().min(1),
  estado: z.string().length(2),
}).refine(
  (data) => data.tipo === "PESSOA_JURIDICA" || data.dataNascimento,
  { message: "Data de nascimento obrigatória para PF", path: ["dataNascimento"] }
)

const ClienteListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  orderBy: z.enum(["nome", "faturamento", "pecas", "ltv", "primeiraCompra"]).default("nome"),
  orderDir: z.enum(["asc", "desc"]).default("asc"),
})
```

### 4.2 Procedures

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista com métricas | Todos (valores: Admin/Sócio) |
| `getById` | Query | Busca por ID completo | Todos (valores: Admin/Sócio) |
| `getByCpfCnpj` | Query | Busca por CPF/CNPJ | Todos |
| `create` | Mutation | Cadastra cliente | Todos |
| `update` | Mutation | Atualiza dados | Todos |
| `archive` | Mutation | Arquiva (soft delete) | Admin/Sócio |
| `delete` | Mutation | Exclui permanentemente | Admin |
| `getHistoricoCompras` | Query | Lista compras do cliente | Todos (valores: Admin/Sócio) |
| `getDashboard` | Query | Métricas para dashboard | Admin/Sócio |
| `getTopClientes` | Query | Rankings Top 10 | Admin/Sócio |

### 4.3 Métricas do Cliente

```typescript
// getById retorna:
{
  id: string
  nome: string
  // ... outros campos
  _metricas: {
    faturamentoTotal: number    // R$ - só Admin/Sócio
    numeroPecas: number
    tempoComoCliente: number    // em dias
    recorrencia: number         // compras/mês
    ltv: number                 // R$ - só Admin/Sócio
    primeiraCompra: Date | null
    ultimaCompra: Date | null
  }
}
```

---

## 5. Router: Venda

### 5.1 Schemas

```typescript
const VendaCreateSchema = z.object({
  pecaId: z.string().cuid(),
  clienteId: z.string().cuid(),
  valorOriginal: z.number().positive(),
  valorDesconto: z.number().min(0).optional(),
  valorFinal: z.number().positive(),
  formaPagamento: z.enum(["PIX", "CREDITO_VISTA", "CREDITO_PARCELADO"]),
  parcelas: z.number().int().min(2).max(12).optional(),
  pagamentoInicial: z.number().min(0).optional(), // Valor da entrada
})

const PagamentoSchema = z.object({
  vendaId: z.string().cuid(),
  valor: z.number().positive(),
  data: z.date().default(() => new Date()),
})

const RepasseSchema = z.object({
  vendaId: z.string().cuid(),
  valor: z.number().positive(),
  data: z.date().default(() => new Date()),
})

const VendaListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  statusPagamento: z.enum(["PAGO", "PARCIAL", "NAO_PAGO"]).optional(),
  statusRepasse: z.enum(["FEITO", "PARCIAL", "PENDENTE"]).optional(),
  clienteId: z.string().cuid().optional(),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional(),
})
```

### 5.2 Procedures

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista vendas | Todos (valores: Admin/Sócio) |
| `getById` | Query | Detalhes da venda | Todos (valores: Admin/Sócio) |
| `create` | Mutation | Registra venda | Todos |
| `update` | Mutation | Atualiza venda | Admin/Sócio |
| `cancel` | Mutation | Cancela/devolução | Admin/Sócio |
| `registrarPagamento` | Mutation | Adiciona pagamento | Todos |
| `registrarRepasse` | Mutation | Registra repasse | Admin/Sócio |
| `getReceibiveis` | Query | Total a receber | Admin/Sócio |

### 5.3 Fluxo de Criação de Venda

```typescript
// Procedure create faz:
1. Validar se peça existe e está DISPONÍVEL
2. Validar se cliente existe
3. Buscar taxa MDR da configuração
4. Calcular valores:
   - Se parcelado, aplicar MDR ao valor final
5. Criar registro de venda
6. Se pagamentoInicial > 0, criar registro de pagamento
7. Se peça é consignação:
   - Calcular valorRepasseDevido
   - Criar alerta de repasse pendente
8. Atualizar peça:
   - status = VENDIDA
   - localizacao = "Cliente Final"
9. Registrar histórico de status da peça
10. Registrar auditoria
11. Retornar venda criada
```

---

## 6. Router: Dashboard

### 6.1 Procedures

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `getResumo` | Query | Métricas principais | Todos (valores: Admin/Sócio) |
| `getEstoqueStatus` | Query | Peças por status | Todos |
| `getEstoqueIdeal` | Query | Cálculo estoque ideal | Admin/Sócio |
| `getVendasPeriodo` | Query | Vendas no período | Admin/Sócio |
| `getEvolucaoVendas` | Query | Dados para gráfico | Admin/Sócio |

### 6.2 Retorno getResumo

```typescript
{
  estoque: {
    disponivel: number      // Qtd peças disponíveis
    emTransito: number      // Qtd em trânsito
    revisao: number         // Qtd em revisão
    total: number           // Total em estoque
    valorTotal: number      // R$ - só Admin/Sócio
  },
  vendas: {
    mesAtual: number        // Qtd vendas no mês
    valorMesAtual: number   // R$ - só Admin/Sócio
    recebiveis: number      // R$ pendentes - só Admin/Sócio
  },
  metas: {
    metaSemanal: number     // Configurado
    estoqueIdeal: number    // Calculado
    diferencaEstoque: number // Pode ser negativo
  }
}
```

---

## 7. Router: Admin

### 7.1 Schemas

```typescript
const UserCreateSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(1),
  senha: z.string().min(8),
  nivel: z.enum(["ADMINISTRADOR", "SOCIO", "FUNCIONARIO"]),
})

const ConfiguracaoSchema = z.object({
  chave: z.string(),
  valor: z.string(),
})
```

### 7.2 Procedures

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `listUsers` | Query | Lista usuários | Admin |
| `createUser` | Mutation | Cria usuário | Admin |
| `updateUser` | Mutation | Atualiza usuário | Admin |
| `deleteUser` | Mutation | Exclui usuário | Admin |
| `toggleUserStatus` | Mutation | Bloqueia/desbloqueia | Admin |
| `resetPassword` | Mutation | Reseta senha | Admin |
| `getConfiguracoes` | Query | Lista configs | Admin |
| `updateConfiguracao` | Mutation | Atualiza config | Admin |
| `getAuditoria` | Query | Lista logs | Admin |

### 7.3 Configurações Disponíveis

| Chave | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `taxa_mdr` | number | 4 | Taxa MDR do cartão (%) |
| `lead_time_dias` | number | 20 | Lead time para estoque ideal |
| `meta_vendas_semana` | number | 10 | Meta de vendas semanal |
| `alerta_relojoeiro_dias` | number | 14 | Dias para alerta de revisão |
| `localizacoes` | string[] | [...] | Lista de localizações |

---

## 8. Router: Alerta

### 8.1 Procedures

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista alertas não lidos | Todos |
| `getCount` | Query | Conta alertas não lidos | Todos |
| `marcarLido` | Mutation | Marca como lido | Todos |
| `marcarTodosLidos` | Mutation | Marca todos como lidos | Todos |

### 8.2 Tipos de Alerta

```typescript
enum TipoAlerta {
  ESTOQUE_BAIXO = "ESTOQUE_BAIXO",
  RELOJOEIRO_DEMORADO = "RELOJOEIRO_DEMORADO",
  REPASSE_PENDENTE = "REPASSE_PENDENTE",
}

// Estrutura do alerta
{
  id: string
  tipo: TipoAlerta
  titulo: string
  mensagem: string
  entidade: string | null    // Ex: "Peca", "Venda"
  entidadeId: string | null  // ID relacionado
  lido: boolean
  createdAt: Date
}
```

---

## 9. Erros Padrão

### 9.1 Códigos de Erro

```typescript
// Erros tRPC customizados
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Peça não encontrada",
})

throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Peça não está disponível para venda",
})

throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "Sessão expirada",
})

throw new TRPCError({
  code: "FORBIDDEN",
  message: "Sem permissão para esta ação",
})

throw new TRPCError({
  code: "CONFLICT",
  message: "CPF/CNPJ já cadastrado",
})
```

### 9.2 Tratamento no Frontend

```typescript
const mutation = trpc.peca.create.useMutation({
  onError: (error) => {
    if (error.data?.code === "CONFLICT") {
      toast.error("Este fornecedor já está cadastrado")
    } else {
      toast.error(error.message)
    }
  },
  onSuccess: () => {
    toast.success("Peça cadastrada com sucesso!")
    router.push("/estoque")
  },
})
```

---

## 10. Autenticação

### 10.1 Middleware de Proteção

```typescript
// middleware.ts
export default function middleware(request: NextRequest) {
  const session = await getSession(request)
  
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }
  
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (session?.user.nivel !== "ADMINISTRADOR") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }
  
  return NextResponse.next()
}
```

### 10.2 Proteção nos Procedures

```typescript
// Procedure protegido
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  })
})

// Procedure admin only
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.nivel !== "ADMINISTRADOR") {
    throw new TRPCError({ code: "FORBIDDEN" })
  }
  return next({ ctx })
})
```

---

*Documento criado em: Janeiro/2026*
*Versão: 1.0*
*Atualizar conforme APIs evoluem*
