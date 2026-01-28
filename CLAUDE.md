# Sistema de Gestão Operacional Mr. Chrono

Sistema de gestão operacional para escalar as operações da Mr. Chrono, relojoaria digital especializada em relógios vintage. Sistema modular com foco inicial em Gestão de Estoque, Vendas, Clientes e Fornecedores.

---

## Stack Tecnológica (Better-T-Stack)

| Camada | Tecnologia | Descrição |
|--------|------------|-----------|
| **Frontend** | Next.js 14+ | App Router, Server Components |
| **Backend** | Self-hosted | API routes no Next.js |
| **API** | tRPC | Type-safe APIs end-to-end |
| **Auth** | Better-Auth | Sistema de autenticação moderno |
| **Database** | PostgreSQL | Banco relacional (Orbstack local) |
| **ORM** | Prisma | Type-safe database client |
| **Package Manager** | npm | Gerenciador de pacotes |
| **Versionamento** | Git | Controle de versão |

### Comando de Criação do Projeto

```bash
npx create-better-t-stack@latest gestaomrchrono \
  --frontend next \
  --backend self \
  --runtime none \
  --api trpc \
  --auth better-auth \
  --payments none \
  --database postgres \
  --orm prisma \
  --db-setup none \
  --package-manager npm \
  --git \
  --web-deploy none \
  --server-deploy none \
  --install \
  --addons none \
  --examples none
```

---

## Comandos Essenciais

```bash
npm run dev          # Servidor de desenvolvimento (localhost:3000)
npm run build        # Build de produção
npm run lint         # ESLint
npm run typecheck    # Verificar tipos TypeScript
npm run db:push      # Sync schema Prisma com banco
npm run db:studio    # Prisma Studio (GUI do banco)
npm run db:generate  # Gerar Prisma Client
npm run db:seed      # Popular banco com dados iniciais
```

---

## Estrutura de Pastas (Better-T-Stack)

```
gestaomrchrono/
├── apps/
│   └── web/                    # Frontend Next.js
│       ├── app/
│       │   ├── api/            # API routes
│       │   │   └── trpc/       # tRPC endpoint
│       │   ├── (auth)/         # Rotas públicas (login, registro)
│       │   ├── (dashboard)/    # Rotas autenticadas
│       │   │   ├── estoque/    # Módulo de estoque
│       │   │   ├── vendas/     # Módulo de vendas
│       │   │   ├── clientes/   # Módulo de clientes
│       │   │   ├── fornecedores/ # Módulo de fornecedores
│       │   │   └── admin/      # Painel administrativo
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/             # Componentes base (shadcn)
│       │   ├── forms/          # Formulários reutilizáveis
│       │   ├── tables/         # Tabelas e listagens
│       │   └── cards/          # Cards de detalhes
│       └── lib/
│           ├── trpc.ts         # Cliente tRPC
│           └── auth-client.ts  # Cliente Better Auth
├── packages/
│   └── server/                 # Backend tRPC
│       ├── src/
│       │   ├── routers/        # tRPC routers por módulo
│       │   │   ├── peca.ts
│       │   │   ├── fornecedor.ts
│       │   │   ├── cliente.ts
│       │   │   ├── venda.ts
│       │   │   └── admin.ts
│       │   ├── auth.ts         # Config Better Auth
│       │   └── trpc.ts
│       └── prisma/
│           ├── schema.prisma   # Schema do banco
│           └── seed.ts         # Dados iniciais
└── docs/                       # Documentação adicional
    ├── REGRAS_NEGOCIO.md
    ├── ARQUITETURA.md
    └── HANDOFF.md
```

---

## Padrões de Código

- TypeScript strict mode obrigatório
- Server Components por padrão, Client Components só quando necessário ("use client")
- Validação com Zod em TODOS os procedimentos tRPC
- Queries tRPC para leitura, Mutations para escrita
- Imports absolutos com @/ (configurado no tsconfig)
- Nomes descritivos em português para variáveis de negócio
- Componentes funcionais com hooks

---

## Design e Interface

### Princípios de Design

- **Estilo:** Clean, minimalista, moderno, profissional
- **Modo:** Light mode (não implementar dark mode nesta fase)
- **Foco:** Desktop first (responsividade mobile é BAIXA prioridade)
- **Componentes:** shadcn/ui como base

### Diretrizes Visuais

- Paleta de cores clean com tons neutros
- Tipografia clara e hierarquia visual definida
- Whitespace generoso
- Cards com bordas sutis, sem sombras exageradas
- Tabelas limpas com hover states
- Ícones do Lucide React
- Feedback visual claro para ações (loading, success, error)

### Layout Base

- Header fixo com logo, navegação principal e notificações
- Sidebar com menu de módulos
- Área de conteúdo principal com breadcrumbs
- Sem footer complexo

---

## Autenticação (Better Auth)

### Configuração

- Login apenas por email/senha
- Sessão gerenciada automaticamente pelo Better Auth
- Middleware em `middleware.ts` para rotas protegidas
- Hook `useSession()` para dados do usuário no client

### Níveis de Acesso (Roles)

| Nível | Descrição | Acesso |
|-------|-----------|--------|
| ADMINISTRADOR | Acesso total | Tudo + Painel Admin |
| SOCIO | Acesso total aos dados | Tudo, exceto Painel Admin |
| FUNCIONARIO | Acesso limitado | Sem valores em R$, sem excluir |

### Usuário Admin Inicial (Seed)

```
Email: admin@mrchrono.com
Senha: MrChrono@2026
Nível: ADMINISTRADOR
```

---

## Regras de Negócio Críticas

### Peças (Estoque)

1. **SKU automático e sequencial:** `MRC-0001`, `MRC-0002`, etc.
2. **SKU derivado em devolução:** `MRC-0001-1`, `MRC-0001-2`, etc.
3. **Mínimo 1 foto obrigatória** no cadastro
4. **Fornecedor obrigatório** - toda peça DEVE ter fornecedor vinculado
5. **Status contabilizados no estoque:** Disponível, Em Trânsito, Revisão
6. **Status NÃO contabilizados:** Vendida, Defeito, Perda
7. **Histórico de status** deve ser registrado com data, usuário e status anterior/novo

### Vendas

1. **1 venda = 1 peça** (sempre)
2. **Pagamentos parciais permitidos** - registrar múltiplos pagamentos
3. **Taxa MDR do cartão:** 4% (configurável no admin)
4. **Consignação:** ao vender, gerar alerta de repasse pendente
5. **Devolução (7 dias):** peça volta ao estoque com SKU derivado

### Fornecedores e Clientes

1. **CPF/CNPJ únicos** no sistema - validar dígitos verificadores
2. **Criação automática:** ao cadastrar peça com fornecedor novo, criar fornecedor
3. **Criação automática:** ao registrar venda com cliente novo, criar cliente

### Estoque Ideal

```
Estoque Ideal = Meta Semanal × (Lead Time em dias ÷ 7)

Exemplo: Meta 10 peças/semana, Lead Time 20 dias
Estoque Ideal = 10 × (20 ÷ 7) = ~29 peças disponíveis
```

---

## Validações Obrigatórias

### Formulários

- CPF: validar 11 dígitos + dígitos verificadores
- CNPJ: validar 14 dígitos + dígitos verificadores
- Email: formato válido
- Telefone: formato brasileiro
- CEP: 8 dígitos, integrar com API de consulta (ViaCEP)
- Valores monetários: sempre Decimal(10,2) no banco

### Campos Obrigatórios por Entidade

**Peça:** Marca, Modelo, Tamanho Caixa, Valor Compra, Valor Estimado Venda, Origem, Status, Localização, Fornecedor, 1+ Foto

**Fornecedor:** Tipo (PF/PJ), Nome, CPF/CNPJ, Endereço completo, Telefone

**Cliente:** Tipo (PF/PJ), Nome, CPF/CNPJ, Endereço completo, Telefone, Data Nascimento (se PF)

**Venda:** Peça, Cliente, Valor Final, Forma Pagamento

---

## Enums (Prisma Schema)

```prisma
enum NivelAcesso {
  ADMINISTRADOR
  SOCIO
  FUNCIONARIO
}

enum TipoPessoa {
  PESSOA_FISICA
  PESSOA_JURIDICA
}

enum OrigemTipo {
  COMPRA
  CONSIGNACAO
}

enum OrigemCanal {
  PESSOA_FISICA
  LEILAO_BRASIL
  EBAY
}

enum StatusPeca {
  DISPONIVEL
  EM_TRANSITO
  REVISAO
  VENDIDA
  DEFEITO
  PERDA
}

enum FormaPagamento {
  PIX
  CREDITO_VISTA
  CREDITO_PARCELADO
}

enum StatusPagamento {
  PAGO
  PARCIAL
  NAO_PAGO
}

enum StatusRepasse {
  FEITO
  PARCIAL
  PENDENTE
}

enum ScoreFornecedor {
  EXCELENTE
  BOM
  REGULAR
  RUIM
}

enum TipoAlerta {
  ESTOQUE_BAIXO
  RELOJOEIRO_DEMORADO
  REPASSE_PENDENTE
}
```

---

## Localizações Padrão (Configuráveis)

- Rafael (Estoque principal / Filmagens)
- Pedro (Operação)
- Heitor (Operação)
- Tampograth (Restauro de mostrador)
- Fornecedor (Ainda com vendedor original)
- Cliente Final (Após venda)

---

## Parâmetros Configuráveis (Painel Admin)

| Parâmetro | Valor Inicial |
|-----------|---------------|
| Taxa MDR do Cartão | 4% |
| Lead Time (dias) | 20 |
| Meta de Vendas (peças/semana) | Definido pelo admin |
| Alerta peça no relojoeiro (dias) | 14 |

---

## Alertas do Sistema

1. **Estoque abaixo do ideal:** quando peças disponíveis < estoque ideal calculado
2. **Peça no relojoeiro há X dias:** quando peça com status "Revisão" há mais de X dias
3. **Repasse pendente:** quando peça consignada é vendida

---

## ⛔ NÃO Fazer

- NÃO modificar `schema.prisma` sem aprovar migração primeiro
- NÃO instalar dependências sem confirmar comigo
- NÃO criar API routes fora do padrão tRPC (exceto webhooks)
- NÃO usar `any` no TypeScript
- NÃO fazer commits sem aprovação
- NÃO implementar dark mode nesta fase
- NÃO priorizar responsividade mobile
- NÃO criar código "placeholder" ou "TODO" sem avisar
- NÃO assumir regras de negócio - PERGUNTAR sempre
- NÃO deletar código sem backup

---

## Workflow de Desenvolvimento

### Antes de Codar

1. Ler este CLAUDE.md completamente
2. Entender 100% do que precisa ser feito
3. Fazer MUITAS perguntas se algo não estiver claro
4. Propor plano ANTES de implementar
5. Esperar aprovação antes de executar

### Durante o Desenvolvimento

1. Implementar incrementalmente (feature por feature)
2. Rodar `npm run typecheck` após mudanças significativas
3. Testar cada parte antes de prosseguir
4. Commits frequentes com mensagens descritivas em português

### Verificação Final

```bash
npm run build && npm run typecheck && npm run lint
```

---

## Banco de Dados Local

PostgreSQL rodando via Orbstack:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mrchrono"
```

---

## Plugins e Skills Recomendados (Claude Code)

### Instalação Essencial

```bash
# 1. Superpowers - Framework de workflow estruturado
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace

# 2. Frontend Design - UIs profissionais e únicas
/plugins install anthropic/frontend-design

# 3. Context7 - Documentação atualizada (Better Auth, tRPC, Prisma)
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# 4. LSP para TypeScript
/plugin marketplace add boostvolt/claude-code-lsps
/plugin install vtsls@claude-code-lsps
```

### Pré-requisitos

```bash
# TypeScript Language Server
npm install -g @vtsls/language-server typescript
```

---

## MCP Servers Configurados (.mcp.json)

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

---

## Documentos a Criar Antes de Codar

### 1. docs/REGRAS_NEGOCIO.md
Detalhamento completo de cada regra de negócio, edge cases, fluxos específicos.

### 2. docs/ARQUITETURA.md
Decisões arquiteturais, diagramas de entidades, fluxos de dados.

### 3. docs/HANDOFF.md
Documento de transição entre sessões - atualizar sempre antes de /clear.

### 4. .env.example
Variáveis de ambiente necessárias com exemplos.

---

## Ordem de Implementação (Roadmap MVP)

### Fase 1: Setup Inicial
- [ ] Criar projeto com Better-T-Stack CLI
- [ ] Configurar PostgreSQL local (Orbstack)
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Verificar estrutura gerada
- [ ] Primeiro `npm run dev` funcionando

### Fase 2: Banco de Dados
- [ ] Definir schema.prisma completo (todas entidades)
- [ ] Rodar `npm run db:push`
- [ ] Criar seed.ts com usuário admin
- [ ] Testar com Prisma Studio

### Fase 3: Autenticação
- [ ] Configurar Better Auth com email/senha
- [ ] Implementar páginas de login/registro
- [ ] Configurar middleware de proteção
- [ ] Implementar roles (Admin, Sócio, Funcionário)
- [ ] Testar fluxo completo de auth

### Fase 4: Módulo Estoque (Peças)
- [ ] Router tRPC para peças
- [ ] Cadastro de peças (com upload de fotos)
- [ ] Listagem com filtros e busca
- [ ] Card detalhado da peça
- [ ] Histórico de status
- [ ] Edição e arquivamento

### Fase 5: Módulo Fornecedores
- [ ] Router tRPC para fornecedores
- [ ] Cadastro inline no cadastro de peça
- [ ] Listagem com métricas
- [ ] Card detalhado do fornecedor
- [ ] Score/avaliação

### Fase 6: Módulo Vendas
- [ ] Router tRPC para vendas
- [ ] Registro de venda (1 venda = 1 peça)
- [ ] Pagamentos parciais
- [ ] Tratamento de consignação
- [ ] Listagem com status de pagamento
- [ ] Card detalhado da venda

### Fase 7: Módulo Clientes
- [ ] Router tRPC para clientes
- [ ] Cadastro manual e automático
- [ ] Dashboard com rankings e LTV
- [ ] Listagem com métricas
- [ ] Card detalhado com histórico

### Fase 8: Dashboard Principal
- [ ] Métricas de estoque
- [ ] Estoque ideal vs atual
- [ ] Recebíveis pendentes
- [ ] Gráfico de evolução de vendas
- [ ] Visibilidade por nível de acesso

### Fase 9: Painel Administrativo
- [ ] Gestão de usuários
- [ ] Parâmetros configuráveis
- [ ] Log de auditoria
- [ ] Configuração de alertas

### Fase 10: Sistema de Alertas
- [ ] Notificações no header
- [ ] Alerta de estoque baixo
- [ ] Alerta de relojoeiro demorado
- [ ] Alerta de repasse pendente

---

## Links Úteis

- Better-T-Stack: https://www.better-t-stack.dev
- Better Auth: https://www.better-auth.com/docs
- tRPC: https://trpc.io/docs
- Prisma: https://www.prisma.io/docs
- shadcn/ui: https://ui.shadcn.com
- Lucide Icons: https://lucide.dev
- ViaCEP API: https://viacep.com.br

---

## Contexto do Perfil do Usuário

- **Não sou desenvolvedor técnico**
- Conheço bem as regras de negócio do projeto
- Preciso de explicações simples para decisões técnicas
- Prefiro aprovar cada passo do que ter velocidade
- Quero entender o que está sendo construído
- Posso responder QUALQUER pergunta sobre o negócio

---

## Verificação Rápida

```bash
# Antes de qualquer commit
npm run build && npm run typecheck && npm run lint
```

---

*Documento criado em: Janeiro/2026*
*Versão: 1.0*
*Projeto: Sistema de Gestão Mr. Chrono*
