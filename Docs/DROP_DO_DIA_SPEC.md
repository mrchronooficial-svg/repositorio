# DROP DO DIA — Especificação Completa

> **Módulo:** Drop do Dia
> **Autor:** Rafael (Mr. Chrono)
> **Data:** Março 2026
> **Stack:** Next.js + Supabase + tRPC + Prisma + Better-Auth
> **Deploy:** Vercel (gestaomrchrono.vercel.app)

---

## 1. VISÃO GERAL

O "Drop do Dia" é uma nova feature que adiciona uma aba dedicada ao catálogo público (`/catalogo`) com lançamentos diários de 2-3 peças em condição especial, disponibilizadas em horário pré-definido. O objetivo é gerar senso de urgência, escassez e evento diário para a comunidade.

A feature tem **dois lados**:
1. **Catálogo público** (`/catalogo`): nova aba "Drop do Dia" acessível por swipe lateral (mobile) ou clique em ícone (desktop)
2. **Painel admin** (`/catalogo/admin`): novo módulo "Drop do Dia" no menu lateral para gerenciar drops

---

## 2. CATÁLOGO PÚBLICO — NAVEGAÇÃO COM ABAS

### 2.1 Estrutura de Navegação

A página `/catalogo` passa a ter **duas abas** com navegação estilo Instagram:

| Aba | Ícone | Descrição |
|-----|-------|-----------|
| **Catálogo** | Relógio (Clock/Watch) | Catálogo atual, sem alterações |
| **Drop do Dia** | Raio (Zap/Lightning) | Lançamentos diários com condição especial |

### 2.2 Comportamento de Navegação

**Mobile:**
- Swipe horizontal (arrastar dedo para esquerda/direita) alterna entre abas
- Transição suave com animação de slide (igual Instagram: Feed ↔ DMs)
- Usar biblioteca como `framer-motion` ou CSS scroll-snap para o swipe

**Desktop:**
- Clique nos ícones da barra inferior alterna entre abas
- Sem swipe no desktop (apenas clique)

**Barra de abas:**
- Posição: **fixada no rodapé** da tela (bottom bar)
- Dois ícones centralizados com label embaixo
- Aba ativa: ícone preenchido + cor primária da marca
- Aba inativa: ícone outline + cor cinza
- A barra deve ter `z-index` alto para ficar acima do conteúdo

### 2.3 Ícones Sugeridos

Usar `lucide-react`:
- Catálogo: `<Clock />` ou `<Watch />`
- Drop do Dia: `<Zap />`

---

## 3. CATÁLOGO PÚBLICO — ABA "DROP DO DIA"

### 3.1 Estados da Aba

A aba "Drop do Dia" tem **4 estados** dependendo do contexto:

#### Estado 1: PRÉ-DROP (antes do horário de lançamento)

Quando o usuário acessa antes do horário definido para o drop:

- **Countdown timer** grande e centralizado contando até o horário de lançamento
- Formato: `HH:MM:SS` (horas, minutos, segundos)
- Texto acima do countdown: "Próximo Drop em"
- Texto abaixo: horário exato (ex: "Hoje às 20:00")
- Background escuro/dramático para criar expectativa
- Opcionalmente: animação sutil no countdown (pulse ou glow)

#### Estado 2: DROP ATIVO (peças disponíveis)

Quando o horário do drop chegou e há peças disponíveis (não vendidas):

- **Indicadores de engajamento** no topo:
  - 🔴 `{N} pessoas online agora` (número fictício baseado no patamar definido no admin)
  - 💬 `{N} mensagens sobre este drop` (número fictício baseado no patamar definido no admin)
- **Cards das peças** (2 ou 3 peças, layout vertical/scroll):
  - Mesmo template visual do catálogo atual (fotos, vídeo, specs)
  - Se o valor do drop for menor que o valor original:
    - Mostrar valor original com ~~riscado~~ (text-decoration: line-through, cor cinza)
    - Valor do drop em destaque (cor verde ou cor primária, font maior/bold)
    - Badge opcional: "Condição Especial" ou "Preço Drop"
  - Se o valor do drop for igual ao original: mostrar apenas o valor normal
  - **CTA WhatsApp** em cada peça:
    - Mensagem pré-preenchida: `"Olá! Tenho interesse na peça {nome_da_peça} do Drop do Dia 🔥"`
    - Mesmo formato/estilo do CTA do catálogo atual

#### Estado 3: DROP ENCERRADO (todas vendidas)

Quando todas as peças do drop foram marcadas como vendidas:

- As peças continuam visíveis mas com **overlay cinza/opaco**
- Badge "VENDIDO" sobre cada peça (vermelho ou cinza escuro)
- Texto principal: **"Drop encerrado!"**
- Subtexto: **"Volte amanhã"**
- **Countdown para o próximo drop** (se houver um agendado):
  - "Próximo Drop em HH:MM:SS"
  - Data e horário do próximo drop

#### Estado 4: SEM DROP AGENDADO

Quando não há nenhum drop agendado (nem ativo nem futuro):

- Texto: "Nenhum drop agendado no momento"
- Subtexto: "Fique de olho nas nossas redes para novidades!"
- Opcionalmente: link para Instagram / WhatsApp community

### 3.2 Indicadores Fictícios de Engajamento

Os números de "pessoas online" e "mensagens" são **fictícios** e controlados pelo admin:

**Lógica de variação:**
- Admin define um **patamar** (ex: viewers = 150, mensagens = 45)
- O frontend gera variação aleatória em torno desse patamar
- Range de variação sugerido: ±15-20% do patamar
- Atualização a cada 3-5 segundos com transição suave no número
- Exemplo: patamar 150 → varia entre ~125 e ~175

**Implementação:**
```typescript
function getFluctuatingNumber(base: number): number {
  const variance = base * 0.2; // 20% de variação
  const min = Math.round(base - variance);
  const max = Math.round(base + variance);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

- Usar `setInterval` no frontend (3-5s) para atualizar
- Transição visual suave (CSS transition no número ou animação de contagem)

### 3.3 Marcação de "Vendido"

Quando uma peça é marcada como vendida no painel admin:

- O card da peça na aba Drop do Dia muda para estado "vendido":
  - Overlay semi-transparente cinza sobre todo o card (opacity ~0.5)
  - Badge "VENDIDO" centralizado sobre o card
  - CTA WhatsApp desabilitado/removido
  - Preço fica riscado ou cinza
- A transição deve ser em tempo real (Supabase Realtime subscription na tabela de drops)
- Quando **todas** as peças do drop ficam vendidas, transiciona para o Estado 3 (Drop Encerrado)

---

## 4. PAINEL ADMIN — MÓDULO "DROP DO DIA"

### 4.1 Localização

- Novo item no **menu lateral** do admin (`/catalogo/admin`)
- Nome: "Drop do Dia"
- Ícone: `<Zap />` (consistente com a aba pública)
- Posição: após o módulo de Estoque no menu

### 4.2 Tela Principal — Lista de Drops

Ao acessar o módulo, exibe uma lista de drops dividida em seções:

**Seção 1: Drop Ativo** (destaque visual)
- O drop que está acontecendo agora (ou o próximo a acontecer hoje)
- Status: "Ativo", "Aguardando" (pré-horário), "Encerrado"
- Peças vinculadas com status (disponível/vendido)
- Botão rápido para marcar peça como vendida

**Seção 2: Drops Agendados** (futuros)
- Lista cronológica de drops futuros
- Data, horário, número de peças, status
- Ações: editar, excluir

**Seção 3: Histórico de Drops** (passados)
- Log de todos os drops anteriores
- Data, peças, quais venderam, performance
- Apenas visualização (read-only)

### 4.3 Criação/Edição de Drop

Formulário para criar ou editar um drop:

**Campos obrigatórios:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Data do Drop | Date picker | Dia em que o drop acontece |
| Horário de Lançamento | Time picker | Hora exata que as peças ficam visíveis (ex: 20:00) |
| Peças do Drop | Multi-select do Estoque | Selecionar 2-3 peças do módulo Estoque (por SKU/nome) |
| Valor por peça | Input numérico (por peça) | Valor de venda no drop (pode ser diferente do cadastro) |
| Patamar de Viewers | Input numérico | Base para o número fictício de "pessoas online" (ex: 150) |
| Patamar de Mensagens | Input numérico | Base para o número fictício de "mensagens recebidas" (ex: 45) |

**Seleção de peças:**
- Buscar peças do módulo Estoque (que já foram cadastradas)
- Filtro por SKU, marca, modelo
- A peça **NÃO precisa** estar marcada com checkbox de "exibir no catálogo" para ser selecionada para o drop
- Ao selecionar a peça, pré-preencher o valor com o valor de cadastro
- Permitir alterar o valor (para definir preço promocional do drop)
- Quando o valor do drop < valor original, o catálogo público mostra ambos (original riscado + drop em destaque)

**Validações:**
- Não permitir dois drops no mesmo dia/horário
- Mínimo de 1 peça, máximo de 3 peças por drop
- Horário deve ser futuro (não pode criar drop no passado)
- Peça não pode estar em dois drops ativos/agendados simultaneamente

### 4.4 Ação de "Marcar como Vendido"

Na tela do drop ativo, cada peça tem um botão "Marcar como Vendido":

1. Ao clicar, abre modal/sidebar de **registro de venda** (mesmo fluxo do registro de venda normal do sistema)
2. Preencher informações da venda (cliente, valor, forma de pagamento, etc.)
3. Ao confirmar:
   - A peça é marcada como vendida no drop
   - O status da peça no Estoque também é atualizado
   - No catálogo público, a peça aparece como "VENDIDO" em tempo real
4. Se todas as peças do drop forem vendidas, o drop muda para status "Encerrado"

### 4.5 Configuração do Próximo Drop (para countdown pós-encerramento)

O sistema deve identificar automaticamente o próximo drop agendado para mostrar o countdown correto na aba pública quando o drop atual estiver encerrado ou não houver drop ativo.

Lógica:
1. Se há drop ativo com peças disponíveis → mostra as peças
2. Se drop ativo com todas vendidas → "Drop encerrado" + countdown do próximo
3. Se não há drop ativo mas há agendado → countdown do próximo
4. Se não há nenhum drop → mensagem "Nenhum drop agendado"

---

## 5. MODELO DE DADOS (Prisma)

### 5.1 Novas Tabelas

```prisma
model Drop {
  id              String       @id @default(cuid())
  date            DateTime     // Data do drop (apenas date, sem hora)
  launchTime      String       // Horário de lançamento (ex: "20:00")
  launchDateTime  DateTime     // Data + hora combinados (para queries e countdown)
  status          DropStatus   @default(SCHEDULED)
  viewersBase     Int          @default(100)    // Patamar fictício de viewers
  messagesBase    Int          @default(30)     // Patamar fictício de mensagens
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  items           DropItem[]

  @@index([status])
  @@index([launchDateTime])
}

model DropItem {
  id              String         @id @default(cuid())
  dropId          String
  estoqueId       String         // FK para a peça no Estoque
  dropPrice       Float          // Preço no drop (pode ser != preço do estoque)
  originalPrice   Float          // Preço original (snapshot do estoque no momento da criação)
  status          DropItemStatus @default(AVAILABLE)
  soldAt          DateTime?      // Quando foi vendida
  saleId          String?        // FK para o registro de venda (se aplicável)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  drop            Drop           @relation(fields: [dropId], references: [id], onDelete: Cascade)

  @@index([dropId])
  @@index([estoqueId])
  @@index([status])
}

enum DropStatus {
  SCHEDULED    // Agendado (futuro)
  ACTIVE       // Ativo (horário de lançamento já passou, peças disponíveis)
  COMPLETED    // Encerrado (todas vendidas ou dia passou)
}

enum DropItemStatus {
  AVAILABLE    // Disponível para venda
  SOLD         // Vendida
}
```

### 5.2 Relações

- `Drop` → `DropItem[]` (1:N) — um drop tem 1-3 itens
- `DropItem` → `Estoque` (N:1) — cada item referencia uma peça do estoque
- `DropItem` → `Venda` (1:1, opcional) — quando vendida, vincula ao registro de venda

---

## 6. API (tRPC)

### 6.1 Rotas Públicas (sem auth, usadas pelo catálogo)

```typescript
// Buscar drop atual (ativo ou próximo)
drop.getCurrent
// Retorna: drop ativo com itens + dados das peças do estoque
// Ou: próximo drop agendado (para countdown)
// Ou: null (sem drops)

// Buscar dados de uma peça específica do drop (para CTA)
drop.getItem(itemId)
```

### 6.2 Rotas Admin (autenticadas)

```typescript
// Listar todos os drops (ativos + agendados + histórico)
drop.list(filters?)

// Criar novo drop
drop.create({
  date: Date,
  launchTime: string,
  viewersBase: number,
  messagesBase: number,
  items: [{ estoqueId: string, dropPrice: number }]
})

// Editar drop (apenas se SCHEDULED)
drop.update(dropId, data)

// Excluir drop (apenas se SCHEDULED)
drop.delete(dropId)

// Marcar item como vendido (abre fluxo de registro de venda)
drop.markItemSold(itemId, saleData)

// Atualizar status do drop (SCHEDULED → ACTIVE → COMPLETED)
// Pode ser automático via cron/edge function ou manual
drop.updateStatus(dropId, status)
```

### 6.3 Atualização de Status em Tempo Real

Para que o catálogo público reflita mudanças instantaneamente:

**Opção 1 — Supabase Realtime (recomendado):**
- Frontend do catálogo subscribes na tabela `Drop` e `DropItem`
- Quando admin marca como vendido, o catálogo atualiza automaticamente

**Opção 2 — Polling:**
- Frontend faz polling a cada 5-10 segundos na rota `drop.getCurrent`
- Mais simples mas menos responsivo

**Opção 3 — Revalidação:**
- Usar Next.js `revalidatePath` quando o status muda
- Funciona para SSR mas sem real-time no client

**Recomendação:** Supabase Realtime para as mudanças de status (vendido/encerrado), polling para o countdown.

### 6.4 Transição Automática de Status

O status do drop deve transicionar automaticamente:

- `SCHEDULED → ACTIVE`: quando `launchDateTime <= now()` e drop ainda tem itens disponíveis
  - Implementar via: check no `drop.getCurrent` (lazy evaluation no request) OU cron job/edge function
- `ACTIVE → COMPLETED`: quando todas as peças são vendidas OU quando o próximo drop está para começar
  - Implementar via: trigger ao marcar última peça como vendida

**Abordagem sugerida (lazy evaluation):**
Na rota `drop.getCurrent`, antes de retornar:
1. Se há drop SCHEDULED com `launchDateTime <= now()`, atualizar para ACTIVE
2. Se há drop ACTIVE onde todos os items estão SOLD, atualizar para COMPLETED
Isso evita necessidade de cron job separado.

---

## 7. COMPONENTES FRONTEND

### 7.1 Catálogo Público

```
/catalogo (página existente, modificada)
├── BottomTabBar (novo)
│   ├── Tab: Catálogo (ícone Clock)
│   └── Tab: Drop do Dia (ícone Zap)
├── SwipeContainer (novo, wraps ambas as abas)
│   ├── CatalogoTab (conteúdo existente do catálogo)
│   └── DropDoDiaTab (novo)
│       ├── DropCountdown (estado pré-drop)
│       ├── DropActive (estado ativo)
│       │   ├── EngagementIndicators (viewers + mensagens fictícios)
│       │   ├── DropItemCard (por peça)
│       │   │   ├── ImageCarousel / VideoPlayer (reuso do catálogo)
│       │   │   ├── PriceDisplay (original riscado + preço drop)
│       │   │   ├── WhatsAppCTA (mensagem pré-preenchida)
│       │   │   └── SoldOverlay (quando vendida)
│       │   └── ...
│       ├── DropCompleted (estado encerrado)
│       └── DropEmpty (sem drops)
```

### 7.2 Painel Admin

```
/catalogo/admin/drop-do-dia (nova página)
├── DropAdminPage
│   ├── ActiveDropSection
│   │   ├── DropCard (com peças e botão "Marcar Vendido")
│   │   └── ...
│   ├── ScheduledDropsSection
│   │   ├── DropCard (com ações editar/excluir)
│   │   └── ...
│   ├── DropHistorySection
│   │   ├── DropCard (read-only)
│   │   └── ...
│   └── CreateDropModal / CreateDropPage
│       ├── DatePicker
│       ├── TimePicker
│       ├── EstoquePiecePicker (multi-select do estoque)
│       ├── PriceInputPerPiece
│       ├── ViewersBaseInput
│       └── MessagesBaseInput
```

---

## 8. REGRAS DE NEGÓCIO

### 8.1 Drops

1. Cada drop tem uma data e horário de lançamento
2. Um drop pode ter 1 a 3 peças
3. Não pode haver dois drops no mesmo dia com horários que se sobrepõem
4. Peças são selecionadas do módulo Estoque (devem existir previamente)
5. O checkbox de "exibir no catálogo" do Estoque **NÃO** se aplica ao drop — são independentes
6. O valor do drop pode ser diferente (geralmente menor) do valor de cadastro no Estoque
7. Drops agendados podem ser editados ou excluídos; drops ativos/encerrados não
8. Múltiplos drops futuros podem ser agendados

### 8.2 Venda no Drop

1. Atendente marca peça como vendida no painel "Drop do Dia"
2. Ao marcar, abre formulário de registro de venda (mesmo do sistema atual)
3. A venda é registrada normalmente no módulo de Vendas
4. O status da peça no Estoque é atualizado para "vendida"
5. O status do DropItem muda para SOLD
6. No catálogo público, a peça aparece como vendida (overlay cinza + badge)
7. Se todas as peças vendidas → drop muda para COMPLETED

### 8.3 Countdown

1. Antes do horário do drop: countdown mostra tempo restante
2. Countdown conta até `launchDateTime` do drop ativo/próximo
3. Quando countdown chega a zero: transição automática para mostrar as peças
4. Drop encerrado: mostra countdown do próximo drop agendado (se houver)

### 8.4 Números Fictícios

1. Admin define patamar de viewers e mensagens por drop
2. Frontend varia ±20% em torno do patamar
3. Atualização visual a cada 3-5 segundos
4. Números só aparecem quando o drop está ACTIVE
5. Transição suave nos números (CSS transition ou animação de contagem)

---

## 9. DESIGN E UX

### 9.1 Paleta e Estilo

Seguir a identidade visual existente do sistema Mr. Chrono:
- Fontes: Cormorant Garamond (títulos) + DM Sans (body)
- Cores: manter as cores da marca
- O drop deve ter um visual ligeiramente mais "premium/evento" que o catálogo regular (background mais escuro, detalhes dourados/acento)

### 9.2 Bottom Tab Bar

```
┌──────────────────────────────────┐
│                                  │
│        [Conteúdo da aba]         │
│                                  │
│                                  │
├──────────────────────────────────┤
│   🕐 Catálogo    ⚡ Drop do Dia  │
└──────────────────────────────────┘
```

- Altura: ~56-64px
- Background: branco (ou cor do tema)
- Ícones: 24px
- Label: 12px, abaixo do ícone
- Aba ativa: cor primária, aba inativa: cinza

### 9.3 Preço com Desconto

```
    R$ 4.500  ←  valor original (cinza, riscado, font menor)
  R$ 3.200    ←  valor drop (verde ou cor primária, font maior, bold)
```

### 9.4 Card de Peça Vendida

```
┌──────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░ │  ← overlay cinza semi-transparente
│ ░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░ VENDIDO ░░░░░░░░░░ │  ← badge centralizado
│ ░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░ │
│ Omega Seamaster           │  ← info visível mas esmaecida
│ ~~R$ 4.500~~ → R$ 3.200  │
│ [CTA desabilitado]       │
└──────────────────────────┘
```

### 9.5 Tela de Countdown

```
┌──────────────────────────┐
│                          │
│                          │
│    Próximo Drop em       │
│                          │
│     02:34:15             │  ← countdown grande, centralizado
│                          │
│    Hoje às 20:00         │
│                          │
│                          │
└──────────────────────────┘
```

### 9.6 Indicadores de Engajamento

```
┌──────────────────────────┐
│ 🔴 147 pessoas online    │
│ 💬 38 mensagens          │
├──────────────────────────┤
│                          │
│  [Cards das peças...]    │
│                          │
```

---

## 10. IMPLEMENTAÇÃO — ORDEM SUGERIDA

### Fase 1: Modelo de Dados + API Base
1. Criar migration Prisma (tabelas Drop e DropItem)
2. Implementar rotas tRPC admin (CRUD de drops)
3. Implementar rota pública `drop.getCurrent`

### Fase 2: Painel Admin
4. Criar página `/catalogo/admin/drop-do-dia`
5. Implementar lista de drops (ativo + agendados + histórico)
6. Implementar formulário de criação de drop (com seletor de peças do estoque)
7. Implementar ação "Marcar como Vendido" (integrar com fluxo de venda existente)

### Fase 3: Catálogo Público — Navegação
8. Implementar BottomTabBar no `/catalogo`
9. Implementar SwipeContainer (framer-motion ou scroll-snap)
10. Mover catálogo atual para dentro da aba "Catálogo"

### Fase 4: Catálogo Público — Aba Drop do Dia
11. Implementar DropCountdown (estado pré-drop)
12. Implementar DropActive (cards + preço + CTA)
13. Implementar indicadores fictícios de engajamento
14. Implementar estado "vendido" no card (overlay cinza)
15. Implementar estado "Drop Encerrado" + countdown do próximo
16. Implementar estado "Sem Drop"

### Fase 5: Real-time + Polish
17. Configurar Supabase Realtime para status de vendido
18. Testar transições de estado automáticas
19. Polish de animações (countdown, swipe, números flutuantes)
20. Testes mobile e desktop

---

## 11. NOTAS TÉCNICAS

### 11.1 Swipe Container

Duas abordagens possíveis:

**Opção A — CSS Scroll Snap (mais simples):**
```css
.swipe-container {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.swipe-container > .tab-content {
  min-width: 100vw;
  scroll-snap-align: start;
}
```

**Opção B — Framer Motion (mais controle):**
```tsx
import { motion, AnimatePresence } from 'framer-motion';
// Usar drag gesture + page transitions
```

**Recomendação:** CSS Scroll Snap é mais leve e nativo. Usar essa abordagem.

### 11.2 Countdown Timer

```typescript
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));
  
  useEffect(() => {
    const timer = setInterval(() => {
      const left = calculateTimeLeft(targetDate);
      setTimeLeft(left);
      if (left.total <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  
  return timeLeft;
}
```

### 11.3 Timezone

- Todos os horários devem considerar **fuso de Brasília (UTC-3)**
- `launchDateTime` armazenado em UTC no banco
- Frontend converte para horário local (que para o público-alvo será majoritariamente Brasília)

### 11.4 WhatsApp CTA

Mensagem pré-preenchida para o drop:
```
Olá! Tenho interesse na peça {nome_da_peça} do Drop do Dia 🔥
```

URL do CTA:
```
https://wa.me/55{NUMERO_WHATSAPP}?text=Ol%C3%A1!%20Tenho%20interesse%20na%20pe%C3%A7a%20{nome_encoded}%20do%20Drop%20do%20Dia%20%F0%9F%94%A5
```

---

## 12. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Migration Prisma (Drop + DropItem)
- [ ] tRPC router: `drop.getCurrent` (público)
- [ ] tRPC router: `drop.list`, `drop.create`, `drop.update`, `drop.delete` (admin)
- [ ] tRPC router: `drop.markItemSold` (admin)
- [ ] Página admin: `/catalogo/admin/drop-do-dia`
- [ ] Componente: lista de drops (ativo/agendados/histórico)
- [ ] Componente: formulário de criação de drop
- [ ] Componente: seletor de peças do estoque
- [ ] Componente: ação "Marcar Vendido" + modal de venda
- [ ] Componente: BottomTabBar (catálogo público)
- [ ] Componente: SwipeContainer
- [ ] Componente: DropCountdown
- [ ] Componente: DropActive + DropItemCard
- [ ] Componente: PriceDisplay (original riscado + preço drop)
- [ ] Componente: WhatsAppCTA (mensagem pré-preenchida do drop)
- [ ] Componente: SoldOverlay
- [ ] Componente: EngagementIndicators (viewers + mensagens fictícios)
- [ ] Componente: DropCompleted (encerrado + countdown próximo)
- [ ] Componente: DropEmpty (sem drops)
- [ ] Supabase Realtime subscription (status de vendido)
- [ ] Transição automática de status (SCHEDULED → ACTIVE → COMPLETED)
- [ ] Menu lateral: adicionar item "Drop do Dia"
- [ ] Testes: mobile swipe, desktop click, countdown, estados
- [ ] Deploy e verificação em produção
