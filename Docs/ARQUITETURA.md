# Arquitetura Técnica - Sistema Mr. Chrono

> Documento com decisões arquiteturais, diagramas, padrões e estrutura técnica do sistema.

---

## 1. Visão Geral da Arquitetura

### 1.1 Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                  │
│                    (Browser Desktop)                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APP                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  App Router     │  │  Server         │  │  API Routes     │  │
│  │  (Pages)        │  │  Components     │  │  (/api/trpc)    │  │
│  └─────────────────┘  └─────────────────┘  └────────┬────────┘  │
│                                                      │          │
│  ┌─────────────────┐  ┌─────────────────┐           │          │
│  │  Client         │  │  Better Auth    │◀──────────┤          │
│  │  Components     │  │  (Sessions)     │           │          │
│  └─────────────────┘  └─────────────────┘           │          │
└─────────────────────────────────────────────────────┼──────────┘
                                                      │
                          ┌───────────────────────────┘
                          │ tRPC
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      tRPC ROUTERS                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  peca   │ │fornecedor│ │ cliente │ │  venda  │ │  admin  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       └──────────┬┴──────────┬┴──────────┬┴──────────┬┘        │
│                  │           │           │           │          │
│                  ▼           ▼           ▼           ▼          │
│              ┌─────────────────────────────────────────┐        │
│              │           PRISMA CLIENT                 │        │
│              └─────────────────────┬───────────────────┘        │
└────────────────────────────────────┼────────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │    POSTGRESQL       │
                          │    (Orbstack)       │
                          └─────────────────────┘
```

### 1.2 Stack Tecnológica Detalhada

| Camada | Tecnologia | Versão | Responsabilidade |
|--------|------------|--------|------------------|
| Frontend | Next.js | 14+ | UI, Routing, SSR/SSG |
| UI Components | shadcn/ui | latest | Componentes base |
| Styling | Tailwind CSS | 3.x | Estilização |
| Icons | Lucide React | latest | Iconografia |
| API Layer | tRPC | 11.x | Type-safe APIs |
| Validation | Zod | 3.x | Schema validation |
| Auth | Better Auth | latest | Autenticação/Sessões |
| ORM | Prisma | 5.x | Database access |
| Database | PostgreSQL | 16 | Persistência |
| Forms | React Hook Form | 7.x | Gerenciamento de forms |
| State | TanStack Query | 5.x | Server state (via tRPC) |

---

## 2. Decisões Arquiteturais (ADRs)

### ADR-001: Monorepo com Better-T-Stack

**Status:** Aceito

**Contexto:**
Precisamos de uma estrutura de projeto que seja organizada, type-safe e produtiva para um time pequeno.

**Decisão:**
Usar Better-T-Stack que já vem configurado com Next.js + tRPC + Prisma + Better Auth.

**Consequências:**
- ✅ Setup inicial rápido
- ✅ Type-safety end-to-end
- ✅ Padrões já definidos
- ❌ Menos flexibilidade em escolhas específicas

---

### ADR-002: Server Components por Padrão

**Status:** Aceito

**Contexto:**
Next.js 14 introduziu Server Components como padrão. Precisamos definir quando usar Client vs Server.

**Decisão:**
- Server Components para: páginas, layouts, componentes de dados
- Client Components para: interatividade, formulários, hooks de estado

**Consequências:**
- ✅ Melhor performance inicial
- ✅ Menos JavaScript no cliente
- ❌ Curva de aprendizado para saber quando usar cada um

---

### ADR-003: tRPC para API

**Status:** Aceito

**Contexto:**
Precisamos de APIs type-safe que não exijam duplicação de tipos entre frontend e backend.

**Decisão:**
Usar tRPC para toda comunicação cliente-servidor, exceto webhooks externos.

**Consequências:**
- ✅ Types compartilhados automaticamente
- ✅ Validação com Zod integrada
- ✅ Autocomplete no frontend
- ❌ Não é REST padrão (pode dificultar integrações externas futuras)

---

### ADR-004: Soft Delete para Entidades Críticas

**Status:** Aceito

**Contexto:**
Precisamos manter histórico e permitir recuperação de dados excluídos.

**Decisão:**
Implementar soft delete (campo `arquivado: boolean`) para: Peça, Fornecedor, Cliente.

**Consequências:**
- ✅ Dados nunca são perdidos
- ✅ Permite auditoria completa
- ❌ Queries precisam filtrar arquivados
- ❌ Banco cresce mais

---

### ADR-005: Autenticação com Better Auth

**Status:** Aceito

**Contexto:**
Precisamos de autenticação segura com suporte a roles/permissões.

**Decisão:**
Usar Better Auth com:
- Apenas email/senha (sem OAuth inicialmente)
- Sessões em banco de dados
- Middleware para proteção de rotas

**Consequências:**
- ✅ Setup simples
- ✅ Controle total sobre usuários
- ❌ Usuário precisa lembrar senha (sem magic link)

---

### ADR-006: Armazenamento de Imagens

**Status:** Pendente Definição

**Contexto:**
Peças precisam de fotos. Precisamos definir onde armazenar.

**Opções:**
1. Local filesystem (dev only)
2. Cloudinary (recomendado)
3. AWS S3 / Cloudflare R2
4. Vercel Blob

**Decisão Provisória:**
Iniciar com filesystem local para desenvolvimento. Definir solução de produção antes do deploy.

---

## 3. Estrutura de Pastas Detalhada

```
gestaomrchrono/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (auth)/                    # Grupo de rotas públicas
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   ├── register/
│       │   │   │   └── page.tsx
│       │   │   └── layout.tsx             # Layout sem sidebar
│       │   │
│       │   ├── (dashboard)/               # Grupo de rotas autenticadas
│       │   │   ├── page.tsx               # Dashboard principal
│       │   │   ├── layout.tsx             # Layout com sidebar
│       │   │   │
│       │   │   ├── estoque/
│       │   │   │   ├── page.tsx           # Listagem de peças
│       │   │   │   ├── novo/
│       │   │   │   │   └── page.tsx       # Cadastro de peça
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx       # Detalhes da peça
│       │   │   │
│       │   │   ├── vendas/
│       │   │   │   ├── page.tsx           # Listagem de vendas
│       │   │   │   ├── nova/
│       │   │   │   │   └── page.tsx       # Registro de venda
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx       # Detalhes da venda
│       │   │   │
│       │   │   ├── clientes/
│       │   │   │   ├── page.tsx           # Dashboard + listagem
│       │   │   │   ├── novo/
│       │   │   │   │   └── page.tsx       # Cadastro manual
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx       # Card do cliente
│       │   │   │
│       │   │   ├── fornecedores/
│       │   │   │   ├── page.tsx           # Listagem
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx       # Card do fornecedor
│       │   │   │
│       │   │   └── admin/
│       │   │       ├── page.tsx           # Painel admin
│       │   │       ├── usuarios/
│       │   │       │   └── page.tsx       # Gestão de usuários
│       │   │       ├── configuracoes/
│       │   │       │   └── page.tsx       # Parâmetros
│       │   │       └── auditoria/
│       │   │           └── page.tsx       # Logs
│       │   │
│       │   ├── api/
│       │   │   └── trpc/
│       │   │       └── [trpc]/
│       │   │           └── route.ts       # tRPC handler
│       │   │
│       │   ├── layout.tsx                 # Root layout
│       │   ├── page.tsx                   # Redirect para /login ou /dashboard
│       │   └── globals.css
│       │
│       ├── components/
│       │   ├── ui/                        # shadcn components
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── select.tsx
│       │   │   ├── table.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── toast.tsx
│       │   │   └── ...
│       │   │
│       │   ├── layout/
│       │   │   ├── header.tsx
│       │   │   ├── sidebar.tsx
│       │   │   ├── breadcrumbs.tsx
│       │   │   └── notifications.tsx
│       │   │
│       │   ├── forms/
│       │   │   ├── peca-form.tsx
│       │   │   ├── fornecedor-form.tsx
│       │   │   ├── cliente-form.tsx
│       │   │   ├── venda-form.tsx
│       │   │   └── endereco-fields.tsx
│       │   │
│       │   ├── tables/
│       │   │   ├── pecas-table.tsx
│       │   │   ├── vendas-table.tsx
│       │   │   ├── clientes-table.tsx
│       │   │   └── fornecedores-table.tsx
│       │   │
│       │   ├── cards/
│       │   │   ├── peca-card.tsx
│       │   │   ├── venda-card.tsx
│       │   │   ├── cliente-card.tsx
│       │   │   └── fornecedor-card.tsx
│       │   │
│       │   └── charts/
│       │       ├── vendas-chart.tsx
│       │       └── estoque-chart.tsx
│       │
│       ├── lib/
│       │   ├── trpc.ts                    # Cliente tRPC
│       │   ├── auth-client.ts             # Cliente Better Auth
│       │   ├── utils.ts                   # Helpers gerais
│       │   ├── formatters.ts              # Formatação (moeda, data, CPF)
│       │   ├── validators.ts              # Validações (CPF, CNPJ)
│       │   └── constants.ts               # Constantes
│       │
│       ├── hooks/
│       │   ├── use-session.ts
│       │   ├── use-permissions.ts
│       │   └── use-notifications.ts
│       │
│       └── types/
│           └── index.ts                   # Types adicionais
│
├── packages/
│   └── server/
│       ├── src/
│       │   ├── routers/
│       │   │   ├── index.ts               # Root router
│       │   │   ├── peca.ts
│       │   │   ├── fornecedor.ts
│       │   │   ├── cliente.ts
│       │   │   ├── venda.ts
│       │   │   ├── dashboard.ts
│       │   │   ├── admin.ts
│       │   │   └── alerta.ts
│       │   │
│       │   ├── services/
│       │   │   ├── sku.service.ts         # Geração de SKU
│       │   │   ├── estoque.service.ts     # Cálculos de estoque
│       │   │   ├── auditoria.service.ts   # Registro de auditoria
│       │   │   └── alerta.service.ts      # Geração de alertas
│       │   │
│       │   ├── trpc.ts                    # tRPC setup
│       │   ├── auth.ts                    # Better Auth config
│       │   └── context.ts                 # tRPC context
│       │
│       └── prisma/
│           ├── schema.prisma
│           ├── seed.ts
│           └── migrations/
│
├── docs/
│   ├── REGRAS_NEGOCIO.md
│   ├── ARQUITETURA.md
│   ├── API.md
│   └── HANDOFF.md
│
├── .env.example
├── .gitignore
├── CLAUDE.md
├── package.json
└── README.md
```

---

## 4. Modelo de Dados

### 4.1 Diagrama de Entidades (ERD)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │  Fornecedor │       │   Cliente   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ email       │       │ tipo        │       │ tipo        │
│ nome        │       │ nome        │       │ nome        │
│ senha       │       │ cpfCnpj     │       │ cpfCnpj     │
│ nivel       │       │ telefone    │       │ dataNasc    │
│ ativo       │       │ email       │       │ telefone    │
│ ultimoAcesso│       │ cep/rua/... │       │ email       │
└─────────────┘       │ score       │       │ cep/rua/... │
       │              │ arquivado   │       │ arquivado   │
       │              └──────┬──────┘       └──────┬──────┘
       │                     │                     │
       │                     │ 1:N                 │ 1:N
       │                     ▼                     ▼
       │              ┌─────────────┐       ┌─────────────┐
       │              │    Peca     │       │    Venda    │
       │              ├─────────────┤       ├─────────────┤
       │              │ id          │       │ id          │
       │              │ sku         │◀──────│ pecaId      │
       │              │ skuBase     │       │ clienteId   │──▶
       │              │ marca       │       │ valorOriginal│
       │              │ modelo      │       │ valorDesconto│
       │              │ ano         │       │ valorFinal  │
       │              │ tamanhoCaixa│       │ formaPgto   │
       │              │ materialCx  │       │ parcelas    │
       │              │ materialPul │       │ taxaMDR     │
       │              │ valorCompra │       │ statusPgto  │
       │              │ valorEstVen │       │ valorRepasse│
       │              │ origemTipo  │       │ statusRepasse│
       │              │ origemCanal │       │ cancelada   │
       │              │ valorRepasse│       │ dataVenda   │
       │              │ status      │       └──────┬──────┘
       │              │ localizacao │              │
       │              │ fornecedorId│──▶           │ 1:N
       │              │ arquivado   │              ▼
       │              └──────┬──────┘       ┌─────────────┐
       │                     │              │  Pagamento  │
       │                     │ 1:N         ├─────────────┤
       │                     ▼              │ id          │
       │              ┌─────────────┐       │ vendaId     │
       │              │    Foto     │       │ valor       │
       │              ├─────────────┤       │ data        │
       │              │ id          │       └─────────────┘
       │              │ url         │
       │              │ ordem       │
       │              │ pecaId      │
       │              └─────────────┘
       │
       │                     ┌─────────────┐
       │                     │HistoricoStatus│
       │                     ├─────────────┤
       │                     │ id          │
       │                     │ pecaId      │
       │                     │ statusAnt   │
       │                     │ statusNovo  │
       │                     │ localAnt    │
       │                     │ localNovo   │
       │                     │ userId      │
       │                     │ createdAt   │
       │                     └─────────────┘
       │
       └─────────────────────┐
                             ▼
                      ┌─────────────┐
                      │  Auditoria  │
                      ├─────────────┤
                      │ id          │
                      │ userId      │
                      │ acao        │
                      │ entidade    │
                      │ entidadeId  │
                      │ detalhes    │
                      │ createdAt   │
                      └─────────────┘
```

### 4.2 Índices Recomendados

```sql
-- Busca frequente por SKU
CREATE INDEX idx_peca_sku ON Peca(sku);

-- Filtro por status e localização
CREATE INDEX idx_peca_status ON Peca(status);
CREATE INDEX idx_peca_localizacao ON Peca(localizacao);

-- Busca por CPF/CNPJ
CREATE INDEX idx_fornecedor_cpfcnpj ON Fornecedor(cpfCnpj);
CREATE INDEX idx_cliente_cpfcnpj ON Cliente(cpfCnpj);

-- Ordenação de vendas por data
CREATE INDEX idx_venda_data ON Venda(dataVenda DESC);

-- Auditoria por período
CREATE INDEX idx_auditoria_created ON Auditoria(createdAt DESC);
```

---

## 5. Fluxos de Dados

### 5.1 Cadastro de Peça

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│  tRPC    │───▶│ Service  │───▶│  Prisma  │
│  Form    │    │  Router  │    │   SKU    │    │  Create  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │
     │   1. Submit   │               │               │
     │──────────────▶│               │               │
     │               │  2. Validate  │               │
     │               │──────────────▶│               │
     │               │               │  3. Gen SKU   │
     │               │               │──────────────▶│
     │               │               │◀──────────────│
     │               │               │  4. Create    │
     │               │               │──────────────▶│
     │               │◀──────────────│               │
     │               │  5. Audit     │               │
     │               │──────────────▶│               │
     │◀──────────────│               │               │
     │   6. Success  │               │               │
```

### 5.2 Registro de Venda

```
1. Buscar peça por SKU
   └─▶ Validar status = DISPONIVEL

2. Buscar/Criar cliente por CPF
   └─▶ Se novo, criar inline

3. Registrar venda
   ├─▶ Calcular valores (desconto, MDR)
   ├─▶ Se consignação, registrar repasse pendente
   └─▶ Registrar pagamento inicial (se houver)

4. Atualizar peça
   ├─▶ Status = VENDIDA
   └─▶ Localização = CLIENTE_FINAL

5. Gerar alertas
   └─▶ Se consignação, alerta de repasse

6. Registrar auditoria
```

---

## 6. Segurança

### 6.1 Autenticação

- Sessões armazenadas no banco (não em cookies apenas)
- Senhas com hash bcrypt (via Better Auth)
- Sessões expiram após 24h de inatividade

### 6.2 Autorização

- Middleware verifica sessão em todas as rotas /dashboard/*
- Cada procedure tRPC verifica nível de acesso
- UI esconde elementos baseado em permissões

### 6.3 Validação

- Todos os inputs validados com Zod
- Sanitização de strings
- Rate limiting (a implementar)

### 6.4 Dados Sensíveis

- Senhas nunca retornadas em queries
- Valores financeiros visíveis apenas para Admin/Sócio
- Logs de auditoria para ações sensíveis

---

## 7. Performance

### 7.1 Estratégias

| Área | Estratégia |
|------|------------|
| Queries | Usar select específico, evitar N+1 |
| Paginação | Cursor-based para listagens grandes |
| Cache | TanStack Query com staleTime |
| Imagens | Lazy loading, thumbnails para listagens |
| Bundle | Dynamic imports para módulos admin |

### 7.2 Limites

| Recurso | Limite |
|---------|--------|
| Itens por página | 20 (configurável) |
| Upload de imagem | 5MB max |
| Fotos por peça | Sem limite (monitorar) |
| Sessão | 24h |

---

## 8. Monitoramento (Futuro)

### 8.1 Logs

- Erros de aplicação
- Queries lentas (> 1s)
- Falhas de autenticação
- Ações de auditoria

### 8.2 Métricas

- Tempo de resposta das APIs
- Taxa de erro
- Usuários ativos
- Operações por tipo

---

*Documento criado em: Janeiro/2026*
*Versão: 1.0*
*Atualizar conforme arquitetura evolui*
