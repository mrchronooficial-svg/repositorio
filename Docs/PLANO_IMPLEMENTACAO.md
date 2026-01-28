# Plano de Implementação - Sistema de Gestão Mr. Chrono

> Plano super detalhado em 8 fases para implementação completa do sistema.

---

## Sumário Executivo

Este plano detalha a implementação completa do Sistema de Gestão Mr. Chrono em **8 fases** incrementais. O sistema é um monorepo Better-T-Stack com Next.js 16, tRPC, Prisma, Better Auth e PostgreSQL.

### Estado Atual do Projeto

| Item | Status |
|------|--------|
| Monorepo configurado | ✅ Concluído |
| Better Auth básico (login/logout) | ✅ Concluído |
| tRPC com publicProcedure/protectedProcedure | ✅ Concluído |
| Componentes shadcn/ui básicos | ✅ Concluído |
| Documentação em Docs/ | ✅ Concluído |
| Schema Prisma de negócio | ❌ Pendente |
| Routers tRPC de negócio | ❌ Pendente |
| Páginas dos módulos | ❌ Pendente |

### O Que Será Implementado

1. Schema Prisma completo (16 models conforme DATABASE_SCHEMA.md)
2. 7 routers tRPC: peca, fornecedor, cliente, venda, dashboard, admin, alerta
3. Módulos do frontend: Estoque, Vendas, Clientes, Fornecedores, Dashboard, Admin
4. Upload de fotos (mínimo 1 por peça)
5. Sistema de alertas
6. Permissões por nível de acesso (ADMINISTRADOR, SOCIO, FUNCIONARIO)

---

## Visão Geral das Fases

| Fase | Nome | Complexidade | Dependência |
|------|------|--------------|-------------|
| 1 | Banco de Dados e Schema Prisma | Média | - |
| 2 | Autenticação e Permissões | Média | Fase 1 |
| 3 | Infraestrutura de Layout e Utilitários | Média | Fase 2 |
| 4 | Módulo Fornecedores | Média | Fase 3 |
| 5 | Módulo Estoque/Peças | Alta | Fase 4 |
| 6 | Módulo Vendas + Clientes | Alta | Fase 5 |
| 7 | Dashboard Principal + Sistema de Alertas | Média | Fase 6 |
| 8 | Painel Administrativo | Média | Fase 3 |

---

## FASE 1: Banco de Dados e Schema Prisma

**Objetivo:** Criar o schema completo do banco de dados com todos os 16 models, enums e relações.

**Pré-requisitos:** Projeto já inicializado e PostgreSQL rodando.

**Complexidade:** Média

### 1.1 Arquivos a Criar/Modificar

#### Schema Prisma Principal
**Arquivo:** `packages/db/prisma/schema/negocio.prisma`

**Criar todos os enums:**
- `NivelAcesso` (ADMINISTRADOR, SOCIO, FUNCIONARIO)
- `TipoPessoa` (PESSOA_FISICA, PESSOA_JURIDICA)
- `OrigemTipo` (COMPRA, CONSIGNACAO)
- `OrigemCanal` (PESSOA_FISICA, LEILAO_BRASIL, EBAY)
- `StatusPeca` (DISPONIVEL, EM_TRANSITO, REVISAO, VENDIDA, DEFEITO, PERDA)
- `ScoreFornecedor` (EXCELENTE, BOM, REGULAR, RUIM)
- `FormaPagamento` (PIX, CREDITO_VISTA, CREDITO_PARCELADO)
- `StatusPagamento` (PAGO, PARCIAL, NAO_PAGO)
- `StatusRepasse` (FEITO, PARCIAL, PENDENTE)
- `TipoAlerta` (ESTOQUE_BAIXO, RELOJOEIRO_DEMORADO, REPASSE_PENDENTE)

**Criar todos os models:**
- `Fornecedor` - dados do fornecedor com endereço e score
- `Cliente` - dados do cliente com endereço e data nascimento
- `Peca` - dados do relógio com SKU, valores, status, localização
- `Foto` - fotos das peças com URL e ordem
- `HistoricoStatus` - histórico de mudanças de status
- `Venda` - dados da venda com valores e pagamentos
- `Pagamento` - pagamentos parciais da venda
- `Configuracao` - parâmetros do sistema
- `Alerta` - alertas do sistema
- `Auditoria` - log de ações

#### Modificar Model User
**Arquivo:** `packages/db/prisma/schema/auth.prisma`

Adicionar campo `nivel` do tipo `NivelAcesso` ao model User existente:
```prisma
model User {
  // campos existentes...
  nivel         NivelAcesso @default(FUNCIONARIO)
  // relações
  auditorias    Auditoria[]
  historicos    HistoricoStatus[]
}
```

#### Seed com Dados Iniciais
**Arquivo:** `packages/db/prisma/seed.ts`

Criar seed com:
- Usuário admin (admin@mrchrono.com / MrChrono@2026)
- Configurações padrão (taxa_mdr, lead_time_dias, meta_vendas_semana, etc.)
- Localizações padrão

### 1.2 Critérios de Conclusão

- [ ] Rodar `npm run db:push` sem erros
- [ ] Rodar `npm run db:generate` e gerar Prisma Client
- [ ] Rodar `npm run db:seed` e criar usuário admin
- [ ] Abrir Prisma Studio e verificar todas as tabelas
- [ ] Verificar que todas as relações estão corretas

---

## FASE 2: Autenticação e Permissões

**Objetivo:** Expandir a autenticação existente para suportar níveis de acesso e proteger rotas.

**Pré-requisitos:** Fase 1 concluída.

**Complexidade:** Média

### 2.1 Arquivos a Criar/Modificar

#### Atualizar Context do tRPC
**Arquivo:** `packages/api/src/context.ts`

Modificar para incluir dados do usuário e nível:
```typescript
export async function createContext(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  // Buscar usuário completo com nível
  let user = null;
  if (session?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, nivel: true }
    });
  }

  return { session, user };
}
```

#### Criar Procedures por Nível
**Arquivo:** `packages/api/src/index.ts`

Adicionar procedures específicos:
```typescript
// Procedure para Admin apenas
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.nivel !== 'ADMINISTRADOR') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
  }
  return next({ ctx });
});

// Procedure para Admin ou Sócio
export const socioOuAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['ADMINISTRADOR', 'SOCIO'].includes(ctx.user?.nivel)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
  }
  return next({ ctx });
});
```

#### Criar Hook de Permissões
**Arquivo:** `apps/web/src/hooks/use-permissions.ts`

```typescript
export function usePermissions() {
  const { data: session } = useSession();

  return {
    isAdmin: session?.user?.nivel === 'ADMINISTRADOR',
    isSocio: session?.user?.nivel === 'SOCIO',
    isFuncionario: session?.user?.nivel === 'FUNCIONARIO',
    podeVerValores: ['ADMINISTRADOR', 'SOCIO'].includes(session?.user?.nivel),
    podeExcluir: ['ADMINISTRADOR', 'SOCIO'].includes(session?.user?.nivel),
    podeAcessarAdmin: session?.user?.nivel === 'ADMINISTRADOR',
  };
}
```

#### Criar Hook de Sessão
**Arquivo:** `apps/web/src/hooks/use-session.ts`

```typescript
import { authClient } from "@/lib/auth-client";

export function useSession() {
  return authClient.useSession();
}
```

#### Criar Middleware de Rotas
**Arquivo:** `apps/web/middleware.ts`

Proteger rotas por nível:
```typescript
export async function middleware(request: NextRequest) {
  const session = await getSession(request);
  const path = request.nextUrl.pathname;

  // Rotas públicas
  if (path === '/login' || path === '/') {
    return NextResponse.next();
  }

  // Sem sessão, redireciona para login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin only
  if (path.startsWith('/admin') && session.user.nivel !== 'ADMINISTRADOR') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/estoque/:path*', '/vendas/:path*', '/clientes/:path*', '/fornecedores/:path*']
};
```

### 2.2 Critérios de Conclusão

- [ ] Login funciona e redireciona para /dashboard
- [ ] Usuário admin consegue acessar /admin
- [ ] Usuário funcionário NÃO consegue acessar /admin
- [ ] Hook usePermissions retorna valores corretos
- [ ] Middleware bloqueia rotas não autorizadas

---

## FASE 3: Infraestrutura de Layout e Utilitários

**Objetivo:** Criar o layout base do dashboard, componentes de UI adicionais e utilitários.

**Pré-requisitos:** Fase 2 concluída.

**Complexidade:** Média

### 3.1 Arquivos a Criar

#### Layout do Dashboard
**Arquivo:** `apps/web/src/app/(dashboard)/layout.tsx`

Criar layout com sidebar e header:
- Props: `children`
- Contém: Header fixo, Sidebar colapsável, Área de conteúdo
- Server Component

#### Novo Header
**Arquivo:** `apps/web/src/components/layout/header.tsx`

- Logo Mr. Chrono
- Navegação principal
- Ícone de notificações com badge
- Menu do usuário
- Client Component ("use client")

#### Sidebar
**Arquivo:** `apps/web/src/components/layout/sidebar.tsx`

Links para:
- Dashboard
- Estoque
- Vendas
- Clientes
- Fornecedores
- Admin (se admin)

Props:
- `currentPath: string`
- `userLevel: NivelAcesso`

#### Breadcrumbs
**Arquivo:** `apps/web/src/components/layout/breadcrumbs.tsx`

Props:
- `items: Array<{ label: string; href?: string }>`

#### Componente de Notificações
**Arquivo:** `apps/web/src/components/layout/notifications.tsx`

- Ícone de sino com contador
- Dropdown com lista de alertas
- Client Component
- Usa `trpc.alerta.list.useQuery()`

#### Utilitários de Formatação
**Arquivo:** `apps/web/src/lib/formatters.ts`

```typescript
export function formatCurrency(value: number): string
export function formatCPF(cpf: string): string
export function formatCNPJ(cnpj: string): string
export function formatTelefone(tel: string): string
export function formatCEP(cep: string): string
export function formatDate(date: Date): string
export function formatDateTime(date: Date): string
```

#### Utilitários de Validação
**Arquivo:** `apps/web/src/lib/validators.ts`

```typescript
export function validarCPF(cpf: string): boolean
export function validarCNPJ(cnpj: string): boolean
export function validarCpfCnpj(value: string): boolean
export function validarTelefone(tel: string): boolean
export function validarCEP(cep: string): boolean
```

#### Constantes
**Arquivo:** `apps/web/src/lib/constants.ts`

```typescript
export const STATUS_PECA_LABELS = {...}
export const STATUS_PECA_COLORS = {...}
export const LOCALIZACOES_PADRAO = [...]
export const FORMA_PAGAMENTO_LABELS = {...}
```

#### Componente StatusBadge
**Arquivo:** `apps/web/src/components/status-badge.tsx`

Props:
- `status: StatusPeca | StatusPagamento | StatusRepasse`
- `size?: 'sm' | 'md'`

### 3.2 Componentes shadcn a Instalar

Executar via CLI:
```bash
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add textarea
npx shadcn@latest add tabs
npx shadcn@latest add pagination
npx shadcn@latest add avatar
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add form
npx shadcn@latest add tooltip
```

### 3.3 Critérios de Conclusão

- [ ] Layout com sidebar e header renderiza corretamente
- [ ] Sidebar mostra menu conforme nível do usuário
- [ ] Formatadores funcionam corretamente
- [ ] Validadores retornam true/false corretamente
- [ ] Todos os componentes shadcn instalados

---

## FASE 4: Módulo Fornecedores (Backend + Frontend)

**Objetivo:** Implementar CRUD completo de fornecedores como módulo de referência.

**Pré-requisitos:** Fase 3 concluída.

**Complexidade:** Média

### 4.1 Backend

#### Router tRPC Fornecedor
**Arquivo:** `packages/api/src/routers/fornecedor.ts`

**Schemas Zod:**
```typescript
const FornecedorCreateSchema = z.object({
  tipo: z.enum(['PESSOA_FISICA', 'PESSOA_JURIDICA']),
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
});

const FornecedorListSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  tipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]).optional(),
  score: z.enum(["EXCELENTE", "BOM", "REGULAR", "RUIM"]).optional(),
  search: z.string().optional(),
  arquivado: z.boolean().default(false),
});
```

**Procedures:**

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista fornecedores com paginação e filtros | Todos |
| `getById` | Query | Busca por ID com métricas | Todos |
| `getByCpfCnpj` | Query | Busca por CPF/CNPJ | Todos |
| `create` | Mutation | Cadastra fornecedor | Todos |
| `update` | Mutation | Atualiza dados | Todos |
| `archive` | Mutation | Arquiva (soft delete) | Admin/Sócio |
| `delete` | Mutation | Exclui permanentemente | Admin |
| `getMetricas` | Query | Retorna métricas consolidadas | Admin/Sócio |
| `getPecas` | Query | Lista peças do fornecedor | Todos |

#### Atualizar Root Router
**Arquivo:** `packages/api/src/routers/index.ts`

Adicionar fornecedorRouter ao appRouter.

#### Service de Auditoria
**Arquivo:** `packages/api/src/services/auditoria.service.ts`

```typescript
export async function registrarAuditoria(params: {
  userId: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  detalhes?: object;
}): Promise<void>
```

### 4.2 Frontend

#### Página de Listagem de Fornecedores
**Arquivo:** `apps/web/src/app/(dashboard)/fornecedores/page.tsx`

- Server Component wrapper

**Arquivo:** `apps/web/src/app/(dashboard)/fornecedores/fornecedores-page.tsx`

Props: nenhuma

Estado:
- `filters` (search, tipo, score)
- `page`, `limit`

Queries:
- `trpc.fornecedor.list.useQuery({ ...filters, page, limit })`

Estados de UI:
- Loading: Skeleton de tabela
- Empty: "Nenhum fornecedor encontrado"
- Error: Toast de erro

Componentes:
- Filtros (search input, select tipo, select score)
- Tabela de fornecedores
- Paginação
- Botão "Novo Fornecedor"

#### Tabela de Fornecedores
**Arquivo:** `apps/web/src/components/tables/fornecedores-table.tsx`

Props:
```typescript
interface FornecedoresTableProps {
  fornecedores: Fornecedor[];
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onArchive: (id: string) => void;
  podeVerValores: boolean;
}
```

Colunas:
- Nome
- Tipo (PF/PJ)
- CPF/CNPJ
- Cidade/UF
- Score (badge)
- Peças (quantidade)
- Volume (R$) - se podeVerValores
- Ações (menu dropdown)

#### Formulário de Fornecedor
**Arquivo:** `apps/web/src/components/forms/fornecedor-form.tsx`

Props:
```typescript
interface FornecedorFormProps {
  fornecedor?: Fornecedor; // undefined = novo
  onSuccess: () => void;
  onCancel: () => void;
}
```

Campos:
- Tipo (select: PF/PJ)
- Nome
- CPF/CNPJ (máscara dinâmica)
- Telefone (máscara)
- Email (opcional)
- CEP (com busca ViaCEP)
- Rua, Número, Complemento, Bairro, Cidade, Estado
- Score (select, opcional)

Mutations:
- `trpc.fornecedor.create.useMutation()`
- `trpc.fornecedor.update.useMutation()`

Estados:
- Loading: botão desabilitado + spinner
- Error: toast + highlight campo

#### Campos de Endereço Reutilizáveis
**Arquivo:** `apps/web/src/components/forms/endereco-fields.tsx`

Props:
```typescript
interface EnderecoFieldsProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  disabled?: boolean;
}
```

Integração com ViaCEP para autopreenchimento.

#### Página Novo Fornecedor
**Arquivo:** `apps/web/src/app/(dashboard)/fornecedores/novo/page.tsx`

- Renderiza FornecedorForm em modo criação
- Breadcrumbs: Fornecedores > Novo

#### Página Detalhes/Edição Fornecedor
**Arquivo:** `apps/web/src/app/(dashboard)/fornecedores/[id]/page.tsx`

- Query: `trpc.fornecedor.getById.useQuery({ id })`
- Tabs: Detalhes | Peças | Histórico
- Card com dados do fornecedor
- Botões de ação (Editar, Arquivar)

#### Card de Fornecedor
**Arquivo:** `apps/web/src/components/cards/fornecedor-card.tsx`

Props:
```typescript
interface FornecedorCardProps {
  fornecedor: FornecedorComMetricas;
  podeVerValores: boolean;
}
```

Exibe:
- Dados cadastrais
- Métricas (total peças, volume, peças em estoque, peças vendidas)

### 4.3 Critérios de Conclusão

- [ ] Listar fornecedores com filtros e paginação
- [ ] Criar novo fornecedor com validação
- [ ] Editar fornecedor existente
- [ ] Arquivar fornecedor (soft delete)
- [ ] Busca por CPF/CNPJ funciona
- [ ] Integração ViaCEP funciona
- [ ] Métricas calculadas corretamente
- [ ] Funcionário NÃO vê volumes em R$

---

## FASE 5: Módulo Estoque/Peças (Backend + Frontend)

**Objetivo:** Implementar CRUD completo de peças com SKU automático, upload de fotos e histórico.

**Pré-requisitos:** Fase 4 concluída.

**Complexidade:** Alta

### 5.1 Backend

#### Service de SKU
**Arquivo:** `packages/api/src/services/sku.service.ts`

```typescript
// Gera próximo SKU sequencial
export async function gerarProximoSKU(): Promise<string>
// Retorna: "MRC-0001", "MRC-0002", etc.

// Gera SKU derivado para devolução
export async function gerarSKUDevolucao(skuBase: string): Promise<string>
// Retorna: "MRC-0001-1", "MRC-0001-2", etc.
```

#### Router tRPC Peça
**Arquivo:** `packages/api/src/routers/peca.ts`

**Schemas Zod:**
```typescript
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
});

const PecaUpdateStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["DISPONIVEL", "EM_TRANSITO", "REVISAO", "DEFEITO", "PERDA"]),
  localizacao: z.string().optional(),
});

const PecaListSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  search: z.string().optional(), // busca por SKU
  status: z.enum([...]).optional(),
  localizacao: z.string().optional(),
  marca: z.string().optional(),
  fornecedorId: z.string().optional(),
  arquivado: z.boolean().default(false),
});
```

**Procedures:**

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista peças com filtros e paginação | Todos |
| `getById` | Query | Busca peça por ID com fotos e histórico | Todos |
| `getBySku` | Query | Busca peça por SKU | Todos |
| `create` | Mutation | Cadastra nova peça (gera SKU automático) | Todos |
| `update` | Mutation | Atualiza dados da peça | Todos (vendida: Admin/Sócio) |
| `updateStatus` | Mutation | Altera status/localização (registra histórico) | Todos |
| `archive` | Mutation | Arquiva peça (soft delete) | Admin/Sócio |
| `delete` | Mutation | Exclui peça permanentemente | Admin |
| `getHistorico` | Query | Retorna histórico de status | Todos |
| `getLocalizacoes` | Query | Lista de localizações disponíveis | Todos |

#### Atualizar Root Router
**Arquivo:** `packages/api/src/routers/index.ts`

Adicionar pecaRouter ao appRouter.

### 5.2 Upload de Fotos

#### API Route para Upload
**Arquivo:** `apps/web/src/app/api/upload/route.ts`

API Route para upload de imagens:
- Aceita multipart/form-data
- Valida tipo (jpg, png, webp) e tamanho (max 5MB)
- Salva em pasta pública (dev) ou serviço externo (prod)
- Retorna URL da imagem

#### Componente de Upload de Fotos
**Arquivo:** `apps/web/src/components/forms/foto-upload.tsx`

Props:
```typescript
interface FotoUploadProps {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  maxFotos?: number;
  disabled?: boolean;
}
```

Features:
- Drag and drop
- Preview das fotos
- Reordenar fotos
- Remover foto
- Indicador de upload em progresso
- Validação de tamanho e tipo

### 5.3 Frontend

#### Página de Listagem de Peças
**Arquivo:** `apps/web/src/app/(dashboard)/estoque/page.tsx`

- Server Component wrapper

**Arquivo:** `apps/web/src/app/(dashboard)/estoque/estoque-page.tsx`

Estado:
- `filters` (search, status, localizacao, marca)
- `page`, `limit`

Queries:
- `trpc.peca.list.useQuery({ ...filters })`
- `trpc.peca.getLocalizacoes.useQuery()` (para select)

UI:
- Cards de métricas no topo (disponível, trânsito, revisão, total)
- Filtros
- Tabela de peças
- Paginação

#### Tabela de Peças
**Arquivo:** `apps/web/src/components/tables/pecas-table.tsx`

Props:
```typescript
interface PecasTableProps {
  pecas: Peca[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onChangeStatus: (id: string) => void;
  podeVerValores: boolean;
}
```

Colunas:
- Foto (thumbnail)
- SKU
- Marca/Modelo
- Status (badge)
- Localização
- Valor Compra (se podeVerValores)
- Valor Estimado (se podeVerValores)
- Ações

#### Formulário de Peça
**Arquivo:** `apps/web/src/components/forms/peca-form.tsx`

Props:
```typescript
interface PecaFormProps {
  peca?: Peca;
  onSuccess: () => void;
  onCancel: () => void;
}
```

Seções:
1. Dados Básicos (marca, modelo, ano, tamanho, materiais)
2. Valores (compra, estimado venda)
3. Origem (tipo, canal, fornecedor)
4. Se consignação: valor repasse
5. Localização
6. Fotos (mín 1)

Fornecedor:
- Busca por CPF/CNPJ
- Se não encontrar, mostra formulário inline para criar

#### Página Nova Peça
**Arquivo:** `apps/web/src/app/(dashboard)/estoque/novo/page.tsx`

Renderiza PecaForm em modo criação.

#### Página Detalhes Peça
**Arquivo:** `apps/web/src/app/(dashboard)/estoque/[id]/page.tsx`

Query: `trpc.peca.getById.useQuery({ id })`

Layout:
- Galeria de fotos (carrossel)
- Dados da peça
- Informações do fornecedor
- Histórico de status
- Botões: Editar, Mudar Status, Arquivar

#### Card de Peça
**Arquivo:** `apps/web/src/components/cards/peca-card.tsx`

Props:
```typescript
interface PecaCardProps {
  peca: PecaCompleta;
  podeVerValores: boolean;
  onEdit?: () => void;
  onChangeStatus?: () => void;
}
```

#### Dialog de Mudança de Status
**Arquivo:** `apps/web/src/components/dialogs/status-dialog.tsx`

Props:
```typescript
interface StatusDialogProps {
  peca: Peca;
  open: boolean;
  onClose: () => void;
  onConfirm: (status: StatusPeca, localizacao?: string) => void;
}
```

Features:
- Select de novo status
- Select de localização (se aplicável)
- Validação de transições permitidas
- Confirmação

#### Histórico de Status
**Arquivo:** `apps/web/src/components/historico-status.tsx`

Props:
```typescript
interface HistoricoStatusProps {
  historico: HistoricoStatus[];
}
```

Timeline visual mostrando cada mudança.

### 5.4 Critérios de Conclusão

- [ ] SKU gerado automaticamente no padrão MRC-0001
- [ ] Upload de fotos funciona (mín 1 obrigatória)
- [ ] Listar peças com todos os filtros
- [ ] Criar peça com fornecedor existente
- [ ] Criar peça com fornecedor novo (inline)
- [ ] Editar peça
- [ ] Mudar status com registro no histórico
- [ ] Arquivar peça (soft delete)
- [ ] Histórico de status visualizado em timeline
- [ ] Funcionário NÃO vê valores em R$

---

## FASE 6: Módulo Vendas + Clientes (Backend + Frontend)

**Objetivo:** Implementar registro de vendas com pagamentos parciais, repasse de consignação e módulo de clientes.

**Pré-requisitos:** Fase 5 concluída.

**Complexidade:** Alta

### 6.1 Backend - Cliente

#### Router tRPC Cliente
**Arquivo:** `packages/api/src/routers/cliente.ts`

**Procedures:**

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

**Métricas calculadas:**
- `faturamentoTotal` - soma valor final das vendas
- `numeroPecas` - count de vendas
- `tempoComoCliente` - dias desde primeira compra
- `recorrencia` - compras/mês
- `ltv` - soma (valor venda - valor compra da peça)

### 6.2 Backend - Venda

#### Router tRPC Venda
**Arquivo:** `packages/api/src/routers/venda.ts`

**Schemas Zod:**
```typescript
const VendaCreateSchema = z.object({
  pecaId: z.string().cuid(),
  clienteId: z.string().cuid(),
  valorOriginal: z.number().positive(),
  valorDesconto: z.number().min(0).optional(),
  valorFinal: z.number().positive(),
  formaPagamento: z.enum(["PIX", "CREDITO_VISTA", "CREDITO_PARCELADO"]),
  parcelas: z.number().int().min(2).max(12).optional(),
  pagamentoInicial: z.number().min(0).optional(),
});

const PagamentoSchema = z.object({
  vendaId: z.string().cuid(),
  valor: z.number().positive(),
});

const RepasseSchema = z.object({
  vendaId: z.string().cuid(),
  valor: z.number().positive(),
});
```

**Procedures:**

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista vendas com filtros | Todos (valores: Admin/Sócio) |
| `getById` | Query | Detalhes completos | Todos (valores: Admin/Sócio) |
| `create` | Mutation | Registra venda | Todos |
| `update` | Mutation | Atualiza venda | Admin/Sócio |
| `cancel` | Mutation | Cancela/devolução | Admin/Sócio |
| `registrarPagamento` | Mutation | Adiciona pagamento | Todos |
| `registrarRepasse` | Mutation | Registra repasse | Admin/Sócio |
| `getRecebiveis` | Query | Total a receber | Admin/Sócio |

**Lógica de create:**
1. Validar se peça existe e está DISPONÍVEL
2. Validar se cliente existe
3. Buscar taxa MDR da configuração
4. Criar registro de venda
5. Se pagamentoInicial > 0, criar registro de pagamento
6. Se peça é consignação:
   - Calcular valorRepasseDevido
   - Criar alerta de repasse pendente
7. Atualizar peça:
   - status = VENDIDA
   - localizacao = "Cliente Final"
8. Registrar histórico de status da peça
9. Registrar auditoria
10. Retornar venda criada

#### Service de Alerta
**Arquivo:** `packages/api/src/services/alerta.service.ts`

```typescript
export async function criarAlerta(params: {
  tipo: TipoAlerta;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
}): Promise<void>

export async function verificarEstoqueBaixo(): Promise<void>
// Cria alerta se estoque < estoque ideal

export async function verificarRelojoeiroDemorado(): Promise<void>
// Cria alerta se peça em REVISAO há mais de X dias
```

### 6.3 Frontend - Vendas

#### Página de Registro de Venda
**Arquivo:** `apps/web/src/app/(dashboard)/vendas/nova/page.tsx`

Fluxo:
1. Buscar peça por SKU
2. Mostrar dados da peça (somente se DISPONÍVEL)
3. Buscar cliente por CPF/CNPJ ou criar novo
4. Preencher valores e forma de pagamento
5. Registrar pagamento inicial (opcional)
6. Confirmar venda

#### Formulário de Venda
**Arquivo:** `apps/web/src/components/forms/venda-form.tsx`

Props:
```typescript
interface VendaFormProps {
  onSuccess: (vendaId: string) => void;
}
```

Seções:
1. Busca de Peça (input SKU + resultados)
2. Card da Peça selecionada
3. Busca/Cadastro de Cliente
4. Valores (original, desconto, final)
5. Forma de Pagamento (PIX, Crédito vista, Crédito parcelado + num parcelas)
6. Pagamento Inicial (checkbox + valor)
7. Se consignação, mostra valor de repasse pendente

#### Página de Listagem de Vendas
**Arquivo:** `apps/web/src/app/(dashboard)/vendas/page.tsx`

Filtros:
- Status pagamento
- Status repasse
- Cliente
- Período

Tabela mostra:
- Data
- SKU da peça
- Cliente
- Valor (se permitido)
- Status pagamento (badge)
- Status repasse (badge, se consignação)
- Ações

#### Tabela de Vendas
**Arquivo:** `apps/web/src/components/tables/vendas-table.tsx`

#### Página Detalhes da Venda
**Arquivo:** `apps/web/src/app/(dashboard)/vendas/[id]/page.tsx`

Exibe:
- Dados da peça vendida
- Dados do cliente
- Valores (original, desconto, final, taxa MDR)
- Lista de pagamentos realizados
- Se consignação: dados de repasse
- Botões: Registrar Pagamento, Registrar Repasse, Cancelar/Devolver

#### Card de Venda
**Arquivo:** `apps/web/src/components/cards/venda-card.tsx`

#### Dialog de Pagamento
**Arquivo:** `apps/web/src/components/dialogs/pagamento-dialog.tsx`

Props:
```typescript
interface PagamentoDialogProps {
  venda: Venda;
  open: boolean;
  onClose: () => void;
}
```

Input para valor do pagamento, validação contra saldo restante.

#### Dialog de Repasse
**Arquivo:** `apps/web/src/components/dialogs/repasse-dialog.tsx`

Similar ao pagamento, para registrar repasse ao fornecedor.

#### Dialog de Devolução
**Arquivo:** `apps/web/src/components/dialogs/devolucao-dialog.tsx`

Confirma cancelamento/devolução:
- Cria nova peça com SKU derivado
- Marca venda como cancelada
- Atualiza contadores

### 6.4 Frontend - Clientes

#### Página de Clientes
**Arquivo:** `apps/web/src/app/(dashboard)/clientes/page.tsx`

Layout:
- Dashboard no topo (rankings, métricas)
- Listagem de clientes

#### Dashboard de Clientes
**Arquivo:** `apps/web/src/components/clientes-dashboard.tsx`

Cards de métricas:
- Total de clientes
- Faturamento total (se permitido)
- Top 5 por faturamento
- Top 5 por peças
- Top 5 por LTV

#### Tabela de Clientes
**Arquivo:** `apps/web/src/components/tables/clientes-table.tsx`

#### Formulário de Cliente
**Arquivo:** `apps/web/src/components/forms/cliente-form.tsx`

Similar ao fornecedor, mas com:
- Data de nascimento (obrigatória se PF)

#### Página Detalhes do Cliente
**Arquivo:** `apps/web/src/app/(dashboard)/clientes/[id]/page.tsx`

- Card com dados
- Métricas (faturamento, peças, LTV, recorrência)
- Histórico de compras

#### Card de Cliente
**Arquivo:** `apps/web/src/components/cards/cliente-card.tsx`

### 6.5 Critérios de Conclusão

- [ ] Registrar venda com peça existente
- [ ] Buscar peça por SKU
- [ ] Criar cliente inline durante venda
- [ ] Pagamentos parciais funcionando
- [ ] Status de pagamento atualiza automaticamente
- [ ] Consignação gera alerta de repasse
- [ ] Registrar repasse atualiza status
- [ ] Devolução cria peça com SKU derivado (MRC-0001-1)
- [ ] Dashboard de clientes com rankings
- [ ] Funcionário NÃO vê valores

---

## FASE 7: Dashboard Principal + Sistema de Alertas

**Objetivo:** Implementar dashboard principal com métricas e sistema de alertas.

**Pré-requisitos:** Fase 6 concluída.

**Complexidade:** Média

### 7.1 Backend

#### Router tRPC Dashboard
**Arquivo:** `packages/api/src/routers/dashboard.ts`

**Procedures:**

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `getResumo` | Query | Métricas principais | Todos (valores: Admin/Sócio) |
| `getEstoqueStatus` | Query | Peças por status | Todos |
| `getEstoqueIdeal` | Query | Cálculo estoque ideal | Admin/Sócio |
| `getVendasPeriodo` | Query | Vendas no período | Admin/Sócio |
| `getEvolucaoVendas` | Query | Dados para gráfico | Admin/Sócio |

**Cálculo estoque ideal:**
```
Estoque Ideal = Meta Semanal × (Lead Time ÷ 7)
Exemplo: Meta 10, Lead Time 20 = 10 × (20/7) = ~29 peças
```

**Retorno getResumo:**
```typescript
{
  estoque: {
    disponivel: number,      // Qtd peças disponíveis
    emTransito: number,      // Qtd em trânsito
    revisao: number,         // Qtd em revisão
    total: number,           // Total em estoque
    valorTotal: number,      // R$ - só Admin/Sócio
  },
  vendas: {
    mesAtual: number,        // Qtd vendas no mês
    valorMesAtual: number,   // R$ - só Admin/Sócio
    recebiveis: number,      // R$ pendentes - só Admin/Sócio
  },
  metas: {
    metaSemanal: number,     // Configurado
    estoqueIdeal: number,    // Calculado
    diferencaEstoque: number, // Pode ser negativo
  }
}
```

#### Router tRPC Alerta
**Arquivo:** `packages/api/src/routers/alerta.ts`

**Procedures:**

| Procedure | Tipo | Descrição | Permissão |
|-----------|------|-----------|-----------|
| `list` | Query | Lista alertas não lidos | Todos |
| `getCount` | Query | Conta alertas não lidos | Todos |
| `marcarLido` | Mutation | Marca um como lido | Todos |
| `marcarTodosLidos` | Mutation | Marca todos como lidos | Todos |

#### Service de Estoque
**Arquivo:** `packages/api/src/services/estoque.service.ts`

```typescript
export async function calcularEstoqueIdeal(): Promise<number>
export async function contarPecasDisponiveis(): Promise<number>
export async function verificarAlertaEstoque(): Promise<void>
```

### 7.2 Frontend

#### Página Dashboard Principal
**Arquivo:** `apps/web/src/app/(dashboard)/page.tsx`

Layout:
1. Cards de métricas principais (4 cards)
2. Alerta de estoque (se aplicável)
3. Gráfico de vendas (últimos 30 dias)
4. Lista de alertas pendentes
5. Atividades recentes

#### Cards de Métricas
**Arquivo:** `apps/web/src/components/dashboard/metric-cards.tsx`

4 cards:
- Peças Disponíveis (ícone Package)
- Vendas do Mês (ícone ShoppingCart)
- Recebíveis (ícone Wallet) - se permitido
- Estoque Ideal vs Atual (ícone TrendingUp)

#### Alerta de Estoque
**Arquivo:** `apps/web/src/components/dashboard/estoque-alert.tsx`

Banner visual se estoque < estoque ideal.

#### Gráfico de Vendas
**Arquivo:** `apps/web/src/components/charts/vendas-chart.tsx`

Gráfico de linha simples (pode usar recharts ou Chart.js).

#### Lista de Alertas
**Arquivo:** `apps/web/src/components/dashboard/alertas-list.tsx`

Lista compacta dos alertas pendentes com ações.

#### Atividades Recentes
**Arquivo:** `apps/web/src/components/dashboard/atividades-recentes.tsx`

Últimas 5 ações do sistema (via auditoria).

### 7.3 Critérios de Conclusão

- [ ] Dashboard exibe métricas corretas
- [ ] Cálculo de estoque ideal funciona
- [ ] Alerta de estoque baixo aparece quando aplicável
- [ ] Notificações no header mostram contador
- [ ] Marcar alertas como lidos funciona
- [ ] Funcionário vê métricas de quantidade (sem R$)

---

## FASE 8: Painel Administrativo

**Objetivo:** Implementar painel admin com gestão de usuários, configurações e auditoria.

**Pré-requisitos:** Fase 3 concluída (pode ser paralelo às outras fases).

**Complexidade:** Média

### 8.1 Backend

#### Router tRPC Admin
**Arquivo:** `packages/api/src/routers/admin.ts`

Todas as procedures usam `adminProcedure`.

**Procedures:**

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `listUsers` | Query | Lista usuários |
| `createUser` | Mutation | Cria usuário |
| `updateUser` | Mutation | Atualiza usuário |
| `deleteUser` | Mutation | Exclui usuário |
| `toggleUserStatus` | Mutation | Bloqueia/desbloqueia |
| `resetPassword` | Mutation | Reseta senha |
| `getConfiguracoes` | Query | Lista configs |
| `updateConfiguracao` | Mutation | Atualiza config |
| `getAuditoria` | Query | Lista logs com paginação |

**Configurações Disponíveis:**

| Chave | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `taxa_mdr` | number | 4 | Taxa MDR do cartão (%) |
| `lead_time_dias` | number | 20 | Lead time para estoque ideal |
| `meta_vendas_semana` | number | 10 | Meta de vendas semanal |
| `alerta_relojoeiro_dias` | number | 14 | Dias para alerta de revisão |
| `localizacoes` | string[] | [...] | Lista de localizações |

### 8.2 Frontend

#### Layout Admin
**Arquivo:** `apps/web/src/app/(dashboard)/admin/layout.tsx`

Verificação adicional de nível admin.
Navegação lateral específica do admin.

#### Página Admin Principal
**Arquivo:** `apps/web/src/app/(dashboard)/admin/page.tsx`

Cards com links para subseções:
- Usuários
- Configurações
- Auditoria

#### Página Gestão de Usuários
**Arquivo:** `apps/web/src/app/(dashboard)/admin/usuarios/page.tsx`

Listagem de usuários com:
- Nome
- Email
- Nível (badge)
- Status (ativo/bloqueado)
- Último acesso
- Ações (editar, bloquear, resetar senha)

#### Tabela de Usuários
**Arquivo:** `apps/web/src/components/admin/usuarios-table.tsx`

#### Formulário de Usuário
**Arquivo:** `apps/web/src/components/admin/usuario-form.tsx`

Campos:
- Nome
- Email
- Senha (apenas em criação)
- Nível (select: Administrador, Sócio, Funcionário)

#### Dialog Reset Senha
**Arquivo:** `apps/web/src/components/admin/reset-senha-dialog.tsx`

#### Página Configurações
**Arquivo:** `apps/web/src/app/(dashboard)/admin/configuracoes/page.tsx`

Formulário com:
- Taxa MDR (%) - input numérico
- Lead Time (dias) - input numérico
- Meta de Vendas (peças/semana) - input numérico
- Dias para Alerta Relojoeiro - input numérico
- Localizações (lista editável)

#### Formulário de Configurações
**Arquivo:** `apps/web/src/components/admin/configuracoes-form.tsx`

#### Página Auditoria
**Arquivo:** `apps/web/src/app/(dashboard)/admin/auditoria/page.tsx`

Listagem com filtros:
- Usuário
- Entidade
- Ação
- Período

Tabela mostra:
- Data/Hora
- Usuário
- Ação
- Entidade
- ID
- Detalhes (expansível)

#### Tabela de Auditoria
**Arquivo:** `apps/web/src/components/admin/auditoria-table.tsx`

### 8.3 Critérios de Conclusão

- [ ] Apenas admin acessa /admin
- [ ] CRUD de usuários funciona
- [ ] Bloquear/desbloquear usuário
- [ ] Resetar senha
- [ ] Configurações salvas no banco
- [ ] Log de auditoria com filtros
- [ ] Detalhes de auditoria expansíveis

---

## Resumo de Arquivos por Fase

### FASE 1 (Banco de Dados)
- `packages/db/prisma/schema/negocio.prisma` (CRIAR)
- `packages/db/prisma/schema/auth.prisma` (MODIFICAR)
- `packages/db/prisma/seed.ts` (CRIAR)

### FASE 2 (Autenticação)
- `packages/api/src/context.ts` (MODIFICAR)
- `packages/api/src/index.ts` (MODIFICAR)
- `apps/web/src/hooks/use-permissions.ts` (CRIAR)
- `apps/web/src/hooks/use-session.ts` (CRIAR)
- `apps/web/middleware.ts` (CRIAR)

### FASE 3 (Layout e Utilitários)
- `apps/web/src/app/(dashboard)/layout.tsx` (CRIAR)
- `apps/web/src/components/layout/header.tsx` (CRIAR)
- `apps/web/src/components/layout/sidebar.tsx` (CRIAR)
- `apps/web/src/components/layout/breadcrumbs.tsx` (CRIAR)
- `apps/web/src/components/layout/notifications.tsx` (CRIAR)
- `apps/web/src/lib/formatters.ts` (CRIAR)
- `apps/web/src/lib/validators.ts` (CRIAR)
- `apps/web/src/lib/constants.ts` (CRIAR)
- `apps/web/src/components/status-badge.tsx` (CRIAR)

### FASE 4 (Fornecedores)
- `packages/api/src/routers/fornecedor.ts` (CRIAR)
- `packages/api/src/routers/index.ts` (MODIFICAR)
- `packages/api/src/services/auditoria.service.ts` (CRIAR)
- `apps/web/src/app/(dashboard)/fornecedores/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/fornecedores/fornecedores-page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/fornecedores/novo/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/fornecedores/[id]/page.tsx` (CRIAR)
- `apps/web/src/components/tables/fornecedores-table.tsx` (CRIAR)
- `apps/web/src/components/forms/fornecedor-form.tsx` (CRIAR)
- `apps/web/src/components/forms/endereco-fields.tsx` (CRIAR)
- `apps/web/src/components/cards/fornecedor-card.tsx` (CRIAR)

### FASE 5 (Estoque/Peças)
- `packages/api/src/services/sku.service.ts` (CRIAR)
- `packages/api/src/routers/peca.ts` (CRIAR)
- `apps/web/src/app/api/upload/route.ts` (CRIAR)
- `apps/web/src/components/forms/foto-upload.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/estoque/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/estoque/estoque-page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/estoque/novo/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/estoque/[id]/page.tsx` (CRIAR)
- `apps/web/src/components/tables/pecas-table.tsx` (CRIAR)
- `apps/web/src/components/forms/peca-form.tsx` (CRIAR)
- `apps/web/src/components/cards/peca-card.tsx` (CRIAR)
- `apps/web/src/components/dialogs/status-dialog.tsx` (CRIAR)
- `apps/web/src/components/historico-status.tsx` (CRIAR)

### FASE 6 (Vendas + Clientes)
- `packages/api/src/routers/cliente.ts` (CRIAR)
- `packages/api/src/routers/venda.ts` (CRIAR)
- `packages/api/src/services/alerta.service.ts` (CRIAR)
- `apps/web/src/app/(dashboard)/vendas/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/vendas/nova/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/vendas/[id]/page.tsx` (CRIAR)
- `apps/web/src/components/tables/vendas-table.tsx` (CRIAR)
- `apps/web/src/components/forms/venda-form.tsx` (CRIAR)
- `apps/web/src/components/cards/venda-card.tsx` (CRIAR)
- `apps/web/src/components/dialogs/pagamento-dialog.tsx` (CRIAR)
- `apps/web/src/components/dialogs/repasse-dialog.tsx` (CRIAR)
- `apps/web/src/components/dialogs/devolucao-dialog.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/clientes/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/clientes/novo/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/clientes/[id]/page.tsx` (CRIAR)
- `apps/web/src/components/tables/clientes-table.tsx` (CRIAR)
- `apps/web/src/components/forms/cliente-form.tsx` (CRIAR)
- `apps/web/src/components/cards/cliente-card.tsx` (CRIAR)
- `apps/web/src/components/clientes-dashboard.tsx` (CRIAR)

### FASE 7 (Dashboard + Alertas)
- `packages/api/src/routers/dashboard.ts` (CRIAR)
- `packages/api/src/routers/alerta.ts` (CRIAR)
- `packages/api/src/services/estoque.service.ts` (CRIAR)
- `apps/web/src/app/(dashboard)/page.tsx` (MODIFICAR)
- `apps/web/src/components/dashboard/metric-cards.tsx` (CRIAR)
- `apps/web/src/components/dashboard/estoque-alert.tsx` (CRIAR)
- `apps/web/src/components/charts/vendas-chart.tsx` (CRIAR)
- `apps/web/src/components/dashboard/alertas-list.tsx` (CRIAR)
- `apps/web/src/components/dashboard/atividades-recentes.tsx` (CRIAR)

### FASE 8 (Painel Admin)
- `packages/api/src/routers/admin.ts` (CRIAR)
- `apps/web/src/app/(dashboard)/admin/layout.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/admin/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/admin/usuarios/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/admin/configuracoes/page.tsx` (CRIAR)
- `apps/web/src/app/(dashboard)/admin/auditoria/page.tsx` (CRIAR)
- `apps/web/src/components/admin/usuarios-table.tsx` (CRIAR)
- `apps/web/src/components/admin/usuario-form.tsx` (CRIAR)
- `apps/web/src/components/admin/reset-senha-dialog.tsx` (CRIAR)
- `apps/web/src/components/admin/configuracoes-form.tsx` (CRIAR)
- `apps/web/src/components/admin/auditoria-table.tsx` (CRIAR)

---

## Ordem de Dependências

```
FASE 1 (Banco)
    │
    ▼
FASE 2 (Auth + Permissões)
    │
    ▼
FASE 3 (Layout + Utils)
    │
    ├────────────────────────────────┐
    ▼                                ▼
FASE 4 (Fornecedores)           FASE 8 (Admin) ← Pode ser paralelo
    │
    ▼
FASE 5 (Estoque/Peças) ← Depende de Fornecedores (relação FK)
    │
    ▼
FASE 6 (Vendas + Clientes) ← Depende de Peças e Fornecedores
    │
    ▼
FASE 7 (Dashboard + Alertas) ← Depende de todos os dados
```

---

## Verificação Final

### Comando de Verificação
```bash
npm run build && npm run typecheck && npm run lint
```

### Testes End-to-End Manuais

1. Login como admin (admin@mrchrono.com / MrChrono@2026)
2. Criar fornecedor
3. Criar peça com fornecedor (verificar SKU automático)
4. Mudar status da peça (verificar histórico)
5. Criar cliente durante venda
6. Registrar venda
7. Registrar pagamento parcial
8. Verificar dashboard (métricas)
9. Verificar alertas (se consignação)
10. Testar permissões de funcionário (valores ocultos)

---

## Arquivos Críticos (Top 5)

1. **`packages/db/prisma/schema/negocio.prisma`** - Fundação do sistema
2. **`packages/api/src/routers/peca.ts`** - Lógica mais complexa (SKU, histórico)
3. **`packages/api/src/routers/venda.ts`** - Regras de negócio críticas
4. **`apps/web/src/app/(dashboard)/layout.tsx`** - Estrutura visual
5. **`apps/web/src/hooks/use-permissions.ts`** - Controle de acesso

---

*Documento criado em: Janeiro/2026*
*Versão: 1.0*
*Atualizar conforme progresso do projeto*
