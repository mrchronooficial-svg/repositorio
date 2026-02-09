# Catálogo Mr. Chrono — Plano de Implementação

> **Instruções para implementação** do catálogo público. Seguir fase por fase, testando cada uma antes de avançar.
> Ler `Docs/CATALOGO_SPEC.md` INTEIRO antes de começar qualquer fase.
> Este documento é o "como fazer". A spec é o "o que fazer".

---

## Pré-requisitos

- Ter lido INTEIRO o `Docs/CATALOGO_SPEC.md`
- Ter lido o `CLAUDE.md` da raiz do projeto
- Entender o schema Prisma existente (especialmente os models `Peca`, `Foto`, `Venda`, `Configuracao`)
- O projeto já existe e está funcional (`gestaomrchrono`)
- O deploy é na Vercel, banco no Neon (PostgreSQL), fotos no Vercel Blob

---

## Estrutura de Pastas Alvo

```
apps/web/
├── app/
│   ├── catalogo/                    # NOVA — Rota pública do catálogo
│   │   ├── page.tsx                 # Página principal do catálogo (SSR)
│   │   ├── layout.tsx               # Layout do catálogo (sem sidebar do dashboard)
│   │   ├── [pecaId]/
│   │   │   └── page.tsx             # Página individual da peça (para OG tags)
│   │   └── admin/
│   │       ├── page.tsx             # Painel admin do catálogo (protegido)
│   │       └── layout.tsx           # Layout admin (com auth)
│   └── ...                          # Rotas existentes (não mexer)
├── components/
│   ├── catalogo/                    # NOVA — Componentes do catálogo
│   │   ├── SplashScreen.tsx         # Splash com logo
│   │   ├── CatalogoHeader.tsx       # Header sticky com logo + viewers
│   │   ├── CatalogoFilters.tsx      # Filtros de marca e preço
│   │   ├── CatalogoFeed.tsx         # Feed com infinite scroll
│   │   ├── WatchCard.tsx            # Card individual do relógio
│   │   ├── PhotoCarousel.tsx        # Carrossel de fotos com swipe
│   │   ├── UrgencyBadges.tsx        # Badges de urgência simulados
│   │   ├── InterestButton.tsx       # Botão "Tenho Interesse" → WhatsApp
│   │   ├── ShareButton.tsx          # Botão compartilhar
│   │   ├── SoldBadge.tsx            # Selo "VENDIDO"
│   │   ├── EmptyState.tsx           # "Novas peças em breve"
│   │   └── admin/
│   │       ├── PinManager.tsx       # Gerenciar peças fixadas
│   │       ├── UrgencyConfig.tsx    # Configurar ranges de urgência
│   │       └── AnalyticsDashboard.tsx # Dashboard de analytics
│   └── ...
└── lib/
    ├── catalogo/                    # NOVA — Utils do catálogo
    │   ├── urgency.ts               # Lógica de números simulados
    │   ├── price.ts                 # Cálculo de preço parcelado
    │   └── analytics.ts             # Funções de tracking
    └── ...

packages/
├── server/src/routers/
│   ├── catalogo.ts                  # NOVO — Router tRPC do catálogo (público)
│   ├── catalogo-admin.ts            # NOVO — Router tRPC do admin (protegido)
│   └── ...
└── db/prisma/
    └── schema.prisma                # MODIFICAR — novos campos + nova tabela
```

---

## Fase 1: Schema e Infraestrutura de Dados

### Objetivo
Preparar o banco de dados com os novos campos e tabela necessários.

### Tarefas

#### 1.1 Modificar model `Peca` no `schema.prisma`
Adicionar dois novos campos ao model `Peca` existente:

```prisma
// Adicionar DENTRO do model Peca existente, após o campo "arquivado":
// Catálogo público
pinnedInCatalog  Boolean   @default(false)
pinnedAt         DateTime?
```

Adicionar índice:
```prisma
@@index([pinnedInCatalog])
```

#### 1.2 Criar model `CatalogoEvento`
Adicionar ao schema.prisma:

```prisma
// ============================================
// CATÁLOGO PÚBLICO — EVENTOS/ANALYTICS
// ============================================

model CatalogoEvento {
  id         String   @id @default(cuid())
  tipo       String   // "pageview", "card_view", "click_interesse", "click_share", "filter_use"
  pecaId     String?
  deviceType String?  // "mobile", "desktop", "tablet"
  referrer   String?
  metadata   String?  // JSON
  createdAt  DateTime @default(now())

  @@index([tipo])
  @@index([pecaId])
  @@index([createdAt])
  @@map("catalogo_eventos")
}
```

#### 1.3 Criar seed das configurações de urgência
Adicionar ao seed existente (ou criar script separado) as chaves de configuração na tabela `Configuracao`:

```typescript
const configsCatalogo = [
  // Header
  { chave: 'catalogo_urgencia_header_viewers_min', valor: '15' },
  { chave: 'catalogo_urgencia_header_viewers_max', valor: '45' },
  // Viewers por peça (3 faixas de preço: baixo < 5000, medio 5000-15000, alto > 15000)
  { chave: 'catalogo_urgencia_viewers_min_baixo', valor: '10' },
  { chave: 'catalogo_urgencia_viewers_max_baixo', valor: '20' },
  { chave: 'catalogo_urgencia_viewers_min_medio', valor: '15' },
  { chave: 'catalogo_urgencia_viewers_max_medio', valor: '30' },
  { chave: 'catalogo_urgencia_viewers_min_alto', valor: '25' },
  { chave: 'catalogo_urgencia_viewers_max_alto', valor: '45' },
  // Vendidos 7 dias por peça
  { chave: 'catalogo_urgencia_vendidos_min_baixo', valor: '4' },
  { chave: 'catalogo_urgencia_vendidos_max_baixo', valor: '8' },
  { chave: 'catalogo_urgencia_vendidos_min_medio', valor: '2' },
  { chave: 'catalogo_urgencia_vendidos_max_medio', valor: '5' },
  { chave: 'catalogo_urgencia_vendidos_min_alto', valor: '1' },
  { chave: 'catalogo_urgencia_vendidos_max_alto', valor: '3' },
  // Interações por peça
  { chave: 'catalogo_urgencia_interacoes_min_baixo', valor: '15' },
  { chave: 'catalogo_urgencia_interacoes_max_baixo', valor: '30' },
  { chave: 'catalogo_urgencia_interacoes_min_medio', valor: '20' },
  { chave: 'catalogo_urgencia_interacoes_max_medio', valor: '40' },
  { chave: 'catalogo_urgencia_interacoes_min_alto', valor: '30' },
  { chave: 'catalogo_urgencia_interacoes_max_alto', valor: '60' },
];

for (const config of configsCatalogo) {
  await prisma.configuracao.upsert({
    where: { chave: config.chave },
    update: { valor: config.valor },
    create: config,
  });
}
```

#### 1.4 Push do schema
```bash
npm run db:push
npm run db:generate
```

### Validação da Fase 1
- [ ] `npm run db:push` roda sem erros
- [ ] `npm run db:generate` roda sem erros
- [ ] Model `Peca` tem campos `pinnedInCatalog` e `pinnedAt`
- [ ] Model `CatalogoEvento` existe no banco
- [ ] Configurações de urgência existem na tabela `Configuracao`
- [ ] `npm run typecheck` passa
- [ ] Sistema existente continua funcionando normalmente (nenhuma breaking change)

---

## Fase 2: Backend — Routers tRPC

### Objetivo
Criar os endpoints de API para servir dados ao catálogo e ao painel admin.

### Tarefas

#### 2.1 Criar `catalogo.ts` (router público)
Local: `packages/server/src/routers/catalogo.ts`

Procedures (todos públicos, SEM auth):

**`catalogo.listarPecas`** — Query paginada
- Input: `{ cursor?: string, limit?: number, marca?: string, precoMin?: number, precoMax?: number }`
- Lógica:
  - Buscar peças onde:
    - `arquivado = false`
    - AND (`status = DISPONIVEL` OR (`status = VENDIDA` AND venda.dataVenda > now()-48h AND venda.cancelada = false))
  - Incluir `fotos` (ordenadas por `ordem`)
  - Incluir `venda` (para saber dataVenda se vendida)
  - Aplicar filtros de marca e faixa de preço se fornecidos
  - Ordenar: `pinnedInCatalog DESC, pinnedAt DESC NULLS LAST, createdAt DESC`
  - Paginação cursor-based (usar `id` como cursor)
- Output: `{ items: PecaCatalogo[], nextCursor?: string }`

**`catalogo.getPeca`** — Query de peça individual
- Input: `{ pecaId: string }`
- Mesma lógica de filtro (só DISPONIVEL ou VENDIDA<48h)
- Incluir fotos
- Para a página individual (Open Graph)

**`catalogo.getMarcasDisponiveis`** — Query
- Retorna lista de marcas únicas das peças atualmente no catálogo
- Para popular o filtro de marcas

**`catalogo.getConfiguracoes`** — Query
- Retorna as configurações de urgência (chaves `catalogo_urgencia_*`)
- Para o frontend calcular os números simulados

**`catalogo.registrarEvento`** — Mutation
- Input: `{ tipo: string, pecaId?: string, deviceType?: string, referrer?: string, metadata?: string }`
- Cria registro na tabela `CatalogoEvento`
- Validar tipo com Zod (enum dos tipos válidos)

#### 2.2 Criar `catalogo-admin.ts` (router protegido)
Local: `packages/server/src/routers/catalogo-admin.ts`

Procedures (todos protegidos, exigir auth + nível ADMINISTRADOR ou SOCIO):

**`catalogoAdmin.togglePin`** — Mutation
- Input: `{ pecaId: string, pinned: boolean }`
- Atualiza `pinnedInCatalog` e `pinnedAt` (set now() se pinning, null se unpinning)

**`catalogoAdmin.getPecasParaFixar`** — Query
- Lista peças DISPONÍVEIS com campo `pinnedInCatalog`
- Para o painel de gerenciamento

**`catalogoAdmin.getConfiguracoes`** — Query
- Retorna todas as configurações `catalogo_urgencia_*`

**`catalogoAdmin.updateConfiguracao`** — Mutation
- Input: `{ chave: string, valor: string }`
- Atualiza valor na tabela `Configuracao`
- Validar que a chave começa com `catalogo_urgencia_`

**`catalogoAdmin.getAnalytics`** — Query
- Input: `{ periodo: "hoje" | "7dias" | "30dias" }`
- Retorna:
  - Total de pageviews
  - Total de cliques interesse
  - Total de compartilhamentos
  - Top 10 peças mais visualizadas
  - Top 10 peças com mais cliques interesse
  - Split mobile vs desktop

#### 2.3 Registrar routers no app router principal
Adicionar os novos routers ao `appRouter` existente.

### Validação da Fase 2
- [ ] `catalogo.listarPecas` retorna peças disponíveis com fotos
- [ ] Peças vendidas há <48h aparecem com dados da venda
- [ ] Peças vendidas há >48h NÃO aparecem
- [ ] Filtros de marca e preço funcionam
- [ ] Paginação funciona (cursor-based)
- [ ] Peças fixadas aparecem primeiro
- [ ] Eventos de analytics são registrados
- [ ] Router admin requer autenticação
- [ ] `npm run typecheck` passa

---

## Fase 3: Frontend — Catálogo Público (Layout e Feed)

### Objetivo
Construir a interface pública do catálogo com splash screen, header, filtros e feed.

### Tarefas

#### 3.1 Layout do catálogo
- Criar `app/catalogo/layout.tsx`
- Layout próprio (NÃO usar o layout do dashboard com sidebar)
- Importar Google Fonts: Cormorant Garamond + DM Sans
- Meta tags base para PWA
- Fundo branco, sem sidebar, sem header do sistema

#### 3.2 Splash Screen
- Componente `SplashScreen.tsx`
- Logo Mr. Chrono centralizada (usar imagem estática ou SVG)
- Animação: fade-in → pausa 1.5s → fade-out
- Controle via state local (mostrar apenas na primeira visita da sessão)
- Após a splash, renderizar o feed

#### 3.3 Header Sticky
- Componente `CatalogoHeader.tsx`
- Fixo no topo (`position: sticky`, `top: 0`)
- Logo Mr. Chrono (esquerda)
- Contador simulado de viewers (direita): "X pessoas vendo agora"
- Sombra sutil aparece apenas ao scrollar (usar Intersection Observer ou scroll event)
- Fundo branco, z-index alto

#### 3.4 Filtros
- Componente `CatalogoFilters.tsx`
- Dropdown ou chips para marca (popular via `catalogo.getMarcasDisponiveis`)
- Slider ou chips para faixa de preço
- Posição: abaixo do header sticky
- Estado controlado via URL search params (para que o filtro persista ao compartilhar)

#### 3.5 Feed com Infinite Scroll
- Componente `CatalogoFeed.tsx`
- Usar `useInfiniteQuery` do tRPC/React Query
- Intersection Observer para disparar carregamento do próximo bloco
- Skeleton loaders enquanto carrega
- 1 coluna mobile / 2 colunas desktop (breakpoint ~640px)
- Componente `EmptyState.tsx` quando não há peças ou ao final do scroll

#### 3.6 Utilitário de preço
- Criar `lib/catalogo/price.ts`:
```typescript
export function calcularPrecoParcelado(valorAVista: number): {
  valorParcela: number;
  valorTotal: number;
  numeroParcelas: number;
} {
  const valorComJuros = valorAVista * 1.15;
  const valorParcela = valorComJuros / 12;
  return {
    valorParcela: Math.round(valorParcela * 100) / 100,
    valorTotal: Math.round(valorComJuros * 100) / 100,
    numeroParcelas: 12,
  };
}

export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
```

#### 3.7 Utilitário de urgência
- Criar `lib/catalogo/urgency.ts`:
```typescript
// Função hash determinística para gerar números consistentes
function hashSeed(pecaId: string, tipo: string): number {
  const dateKey = new Date().toISOString().slice(0, 13); // muda a cada hora
  const str = `${pecaId}-${tipo}-${dateKey}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function gerarNumeroUrgencia(
  pecaId: string,
  tipo: 'viewers' | 'vendidos' | 'interacoes',
  min: number,
  max: number,
): number {
  const seed = hashSeed(pecaId, tipo);
  return min + (seed % (max - min + 1));
}

export function getFaixaPreco(valor: number): 'baixo' | 'medio' | 'alto' {
  if (valor < 5000) return 'baixo';
  if (valor <= 15000) return 'medio';
  return 'alto';
}
```

### Validação da Fase 3
- [ ] Splash screen aparece e some corretamente
- [ ] Header sticky funciona no scroll
- [ ] Contador de viewers no header muda levemente
- [ ] Filtros de marca e preço funcionam
- [ ] Feed carrega peças reais do banco
- [ ] Infinite scroll funciona (carregar mais ao scrollar)
- [ ] Skeleton loaders aparecem durante carregamento
- [ ] Layout responsivo: 1 coluna mobile, 2 desktop
- [ ] "Novas peças em breve" aparece quando não há peças
- [ ] `npm run build` passa sem erros

---

## Fase 4: Frontend — Card do Relógio

### Objetivo
Implementar o card individual com carrossel, informações, urgência e botões.

### Tarefas

#### 4.1 Card principal
- Componente `WatchCard.tsx`
- Recebe dados da peça como prop
- Layout vertical: foto → informações → urgência → botões

#### 4.2 Carrossel de fotos
- Componente `PhotoCarousel.tsx`
- Swipe horizontal no mobile (usar touch events nativos ou lib leve como `embla-carousel`)
- Arrows no desktop (hover)
- Dots indicadores na base
- Lazy loading para fotos além da primeira
- Se peça VENDIDA: overlay com selo "VENDIDO" sobre a primeira foto

#### 4.3 Badges de urgência
- Componente `UrgencyBadges.tsx`
- 3 indicadores com ícones:
  - 🔥 ou ícone de tendência: "X similares vendidos nos últimos 7 dias"
  - 👁 ou ícone de olho: "Y pessoas vendo agora (Z da comunidade)"
  - ❤️ ou ícone de coração: "W pessoas interagiram com essa peça"
- Usar ícones do Lucide React (Eye, TrendingUp, Heart ou similar)
- Números gerados pela função `gerarNumeroUrgencia` (Fase 3)
- Texto em tamanho pequeno, cor cinza/secondary

#### 4.4 Botão "Tenho Interesse"
- Componente `InterestButton.tsx`
- Botão full-width, destaque visual (bg azul marinho, texto branco)
- Ícone do WhatsApp (usar SVG inline ou lucide `MessageCircle`)
- Ao clicar:
  1. Registrar evento analytics (`click_interesse`)
  2. Abrir link WhatsApp: `https://wa.me/5521995505427?text={mensagem}`
  3. Mensagem: `Olá! Tenho interesse no {marca} {modelo} ({ano}). Vi no catálogo da Mr. Chrono.`
  4. Se ano é null, omitir `({ano})`
  5. Mensagem deve ser URL-encoded
- Se peça VENDIDA: substituir por badge "Vendido" (estático, azul marinho)

#### 4.5 Botão "Compartilhar"
- Componente `ShareButton.tsx`
- Ícone de share (Lucide `Share2`)
- Ao clicar:
  1. Registrar evento analytics (`click_share`)
  2. Copiar URL `/catalogo/{pecaId}` para clipboard
  3. Feedback: "Link copiado!" por 2 segundos (toast ou inline)
- Pode usar `navigator.share()` no mobile se disponível (fallback: clipboard)

#### 4.6 Badge "Destaque"
- Para peças com `pinnedInCatalog = true`
- Badge discreto no canto superior do card
- Texto: "Destaque" ou ícone de pin
- Cor azul marinho, estilo sutil

#### 4.7 Selo "VENDIDO"
- Componente `SoldBadge.tsx`
- Overlay semi-transparente sobre a foto principal
- Texto "VENDIDO" grande, centralizado
- Cor: azul marinho (identidade visual, NÃO vermelho)
- Onde o botão "Tenho Interesse" estaria: texto/badge "Vendido"

### Validação da Fase 4
- [ ] Card mostra todas as informações da spec (marca, modelo, ano, tamanho, material, preço)
- [ ] Carrossel de fotos funciona (swipe mobile, arrows desktop)
- [ ] Preço parcelado calculado corretamente (×1.15 ÷ 12)
- [ ] Preço à vista exibido também
- [ ] Badges de urgência mostram números consistentes
- [ ] Números de urgência fazem sentido (caras = mais views, menos vendidos)
- [ ] Botão "Tenho Interesse" abre WhatsApp com mensagem correta
- [ ] Mensagem sem SKU
- [ ] Botão compartilhar copia link e mostra feedback
- [ ] Peças vendidas mostram selo "VENDIDO" + badge substituindo botão
- [ ] Peças fixadas mostram badge "Destaque"
- [ ] Card é responsivo
- [ ] `npm run build` passa

---

## Fase 5: Página Individual e Open Graph

### Objetivo
Criar a rota da peça individual com meta tags dinâmicas para preview no WhatsApp.

### Tarefas

#### 5.1 Rota `/catalogo/[pecaId]/page.tsx`
- Server Component para SSR das meta tags
- `generateMetadata` dinâmico:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const peca = await getPeca(params.pecaId); // buscar do banco direto (server-side)
  if (!peca) return { title: 'Mr. Chrono' };

  const primeiraFoto = peca.fotos.sort((a, b) => a.ordem - b.ordem)[0];
  const titulo = `${peca.marca} ${peca.modelo}${peca.ano ? ` (${peca.ano})` : ''} — Mr. Chrono`;

  return {
    title: titulo,
    description: 'Veja este relógio no catálogo da Mr. Chrono',
    openGraph: {
      title: titulo,
      description: 'Veja este relógio no catálogo da Mr. Chrono',
      images: primeiraFoto ? [{ url: primeiraFoto.url }] : [],
      type: 'website',
    },
  };
}
```
- A página pode renderizar o card da peça individual (ou redirecionar para o catálogo com scroll até a peça)

#### 5.2 Manifest PWA
- Criar `public/manifest.json`:
```json
{
  "name": "Mr. Chrono — Catálogo",
  "short_name": "Mr. Chrono",
  "start_url": "/catalogo",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#0a1628",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
- Adicionar link no layout: `<link rel="manifest" href="/manifest.json" />`
- Adicionar meta tags iOS: `<meta name="apple-mobile-web-app-capable" content="yes" />`
- **NOTA:** Os ícones da logo precisam ser criados (pedir ao fundador ou usar logo existente)

### Validação da Fase 5
- [ ] URL `/catalogo/{pecaId}` carrega com foto e título corretos
- [ ] Meta tags OG presentes no HTML (inspecionar source)
- [ ] Preview funciona ao colar link no WhatsApp (testar!)
- [ ] PWA manifest carrega corretamente
- [ ] Ao salvar na tela inicial, ícone e nome aparecem

---

## Fase 6: Analytics e Tracking

### Objetivo
Implementar rastreamento de eventos anônimos no catálogo.

### Tarefas

#### 6.1 Utilitário de tracking
- Criar `lib/catalogo/analytics.ts`:
```typescript
import { trpc } from '@/lib/trpc';

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet/i.test(ua)) return 'tablet';
  if (/mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function trackEvent(
  tipo: 'pageview' | 'card_view' | 'click_interesse' | 'click_share' | 'filter_use',
  pecaId?: string,
  metadata?: Record<string, unknown>,
) {
  // Fire-and-forget (não bloquear a UI)
  trpc.catalogo.registrarEvento.mutate({
    tipo,
    pecaId,
    deviceType: getDeviceType(),
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  }).catch(() => {}); // silenciar erros de tracking
}
```

#### 6.2 Integrar tracking nos componentes
- `CatalogoFeed.tsx`: trackEvent('pageview') no mount
- `WatchCard.tsx`: trackEvent('card_view', pecaId) com Intersection Observer (quando card entra no viewport)
- `InterestButton.tsx`: trackEvent('click_interesse', pecaId) no onClick (antes de abrir WhatsApp)
- `ShareButton.tsx`: trackEvent('click_share', pecaId) no onClick
- `CatalogoFilters.tsx`: trackEvent('filter_use', undefined, { filtro: 'marca', valor: 'Omega' }) ao aplicar filtro

#### 6.3 Debounce e performance
- card_view: usar Intersection Observer com threshold 0.5 (50% visível)
- Debounce para evitar múltiplos registros do mesmo card (registrar apenas 1x por sessão por peça)
- Usar Set em memória para controlar cards já vistos nesta sessão

### Validação da Fase 6
- [ ] Pageview registrado ao abrir catálogo
- [ ] Card view registrado quando card entra no viewport (1x por peça por sessão)
- [ ] Click interesse registrado ao clicar no botão
- [ ] Click share registrado ao compartilhar
- [ ] Uso de filtro registrado
- [ ] DeviceType correto (mobile/desktop)
- [ ] Nenhum tracking bloqueia a UI (fire-and-forget)
- [ ] Verificar registros na tabela `catalogo_eventos` via Prisma Studio

---

## Fase 7: Painel Admin do Catálogo

### Objetivo
Criar o painel administrativo para gerenciar destaques, urgência e ver analytics.

### Tarefas

#### 7.1 Layout admin
- `app/catalogo/admin/layout.tsx`
- Verificar autenticação (redirect para login se não autenticado)
- Verificar nível de acesso (ADMINISTRADOR ou SOCIO)
- Layout simples: header com "Admin Catálogo" + link para voltar ao catálogo + link para o dashboard principal

#### 7.2 Gerenciador de peças fixadas
- Componente `PinManager.tsx`
- Lista de peças DISPONÍVEIS com toggle switch para fixar/desfixar
- Mostrar: foto thumb, marca, modelo, status de fixação
- Ao togglear: chamar `catalogoAdmin.togglePin`
- Feedback visual imediato (otimistic update)

#### 7.3 Configuração de urgência
- Componente `UrgencyConfig.tsx`
- Formulário com inputs numéricos para cada range
- Organizado por seção: Header, Viewers por preço, Vendidos por preço, Interações por preço
- Botão "Salvar" que atualiza todos os valores de uma vez
- Carregar valores atuais via `catalogoAdmin.getConfiguracoes`

#### 7.4 Dashboard de analytics
- Componente `AnalyticsDashboard.tsx`
- Seletor de período: "Hoje", "7 dias", "30 dias"
- Cards com métricas:
  - Total pageviews
  - Total cliques interesse
  - Total compartilhamentos
  - % mobile vs desktop
- Tabela/ranking: "Peças mais visualizadas" (top 10)
- Tabela/ranking: "Peças com mais interesse" (top 10)
- Usar shadcn/ui para cards e tabelas (manter consistência com o restante do sistema)

### Validação da Fase 7
- [ ] Admin requer login (redireciona se não autenticado)
- [ ] Admin requer nível ADMINISTRADOR ou SOCIO
- [ ] Toggle de fixar/desfixar funciona
- [ ] Peças fixadas aparecem no topo do catálogo público
- [ ] Configurações de urgência são salvas e refletem no catálogo
- [ ] Analytics mostram dados reais dos eventos registrados
- [ ] Filtro de período funciona
- [ ] Rankings de peças aparecem corretamente
- [ ] `npm run build` passa

---

## Fase 8: Polish, Testes e Deploy

### Objetivo
Refinar o design, testar edge cases e preparar para deploy.

### Tarefas

#### 8.1 Design polish
- Revisar tipografia (Cormorant Garamond + DM Sans carregando corretamente)
- Verificar espaçamentos e whitespace
- Animações de entrada nos cards (staggered fade-in)
- Hover states nos botões e cards
- Transição suave da splash screen
- Verificar que NÃO há elementos genéricos de "AI slop"

#### 8.2 Edge cases
- Peça sem foto (mostrar placeholder)
- Peça sem ano (omitir do card e da mensagem WhatsApp)
- Peça sem material (omitir do card)
- Zero peças disponíveis (empty state)
- Filtro que retorna zero resultados
- Carrossel com apenas 1 foto
- Peça vendida exatamente no momento de 48h (boundary)
- URL de peça inexistente (404 graceful)

#### 8.3 Performance
- Lighthouse score no mobile (almejar >80 em performance)
- Verificar lazy loading funciona (não carregar 50 peças de uma vez)
- Verificar tamanho do bundle (não importar libs desnecessárias)
- Verificar que imagens usam `<Image>` do Next.js (ou ao menos `loading="lazy"`)

#### 8.4 Teste mobile real
- Testar no celular de verdade (não apenas DevTools)
- Verificar swipe do carrossel
- Verificar que WhatsApp abre corretamente
- Verificar que share/clipboard funciona

#### 8.5 Deploy
- `npm run build` sem erros
- `npm run typecheck` sem erros
- Deploy via push para o repositório (Vercel auto-deploy)
- Verificar que o catálogo funciona em produção
- Verificar que o Open Graph funciona ao compartilhar link no WhatsApp

### Validação da Fase 8
- [ ] Design é clean, minimalista, sofisticado (não genérico)
- [ ] Todos os edge cases tratados
- [ ] Performance aceitável no mobile
- [ ] Funciona em celular real
- [ ] Deploy em produção OK
- [ ] Open Graph preview funciona no WhatsApp
- [ ] Admin funciona em produção
- [ ] Nenhuma breaking change no sistema existente

---

## Notas Importantes para o Claude Code

### ⛔ NÃO FAZER
- NÃO modificar componentes/rotas existentes do dashboard
- NÃO alterar a lógica de auth existente (apenas usar)
- NÃO instalar libs pesadas sem necessidade (preferir CSS puro para animações)
- NÃO fazer o catálogo depender de JavaScript para renderizar (SSR no mínimo para OG tags)
- NÃO usar números de urgência reais (são todos simulados por design)
- NÃO colocar SKU na mensagem do WhatsApp
- NÃO usar vermelho no selo "VENDIDO" (usar azul marinho)
- NÃO implementar features marcadas como "fora de escopo" na spec

### ✅ SEMPRE FAZER
- Testar `npm run typecheck` após cada fase
- Testar `npm run build` antes de marcar fase como concluída
- Usar os types do Prisma (não criar types duplicados)
- Usar tRPC para todas as chamadas de API
- Manter consistência visual com azul marinho (#0a1628) + branco
- Usar Cormorant Garamond para títulos e DM Sans para corpo
- Registrar eventos de analytics em todos os pontos de interação

### 📐 Referências
- **Spec completa:** `Docs/CATALOGO_SPEC.md`
- **Schema Prisma:** `packages/db/prisma/schema.prisma`
- **Sistema existente (CLAUDE.md):** `CLAUDE.md` na raiz
- **Repositório:** https://github.com/mrchronooficial-svg/repositorio
- **Deploy:** Vercel (gestaomrchrono.vercel.app)
- **Banco:** Neon (PostgreSQL)
- **Fotos:** Vercel Blob
