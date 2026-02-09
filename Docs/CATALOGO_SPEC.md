# Catálogo Público Mr. Chrono — Especificação Completa

> **Documento de referência** para implementação do catálogo público de relógios.
> Contém TODAS as decisões de produto, design, UX, regras e mapeamento técnico.
> Ler este documento INTEIRO antes de escrever qualquer código.

---

## 1. Visão Geral do Produto

### O que é
Página pública de catálogo de relógios da Mr. Chrono — um feed estilo Instagram, mobile-first, com fotos em carrossel, informações da peça, gatilhos de urgência simulados e integração direta com WhatsApp para conversão.

### Objetivo de negócio
- Dar aos clientes um link fixo e sempre atualizado com o estoque disponível
- Gerar senso de urgência para acelerar decisão de compra
- Facilitar compartilhamento de peças específicas
- Coletar dados anônimos de comportamento (views, cliques)
- Permitir que a equipe destaque peças no topo (boost para encalhadas)

### Onde vive
O catálogo será uma **rota pública dentro do mesmo projeto** (`gestaomrchrono`), não um projeto separado. Isso permite compartilhar o Prisma Client, o Vercel Blob e o deploy na Vercel.

### URL
- **Produção futura:** `catalogo.mrchrono.com.br` (subdomínio)
- **Desenvolvimento/staging:** manter no domínio da Vercel (ex: `gestaomrchrono.vercel.app/catalogo`)
- **Rota no Next.js:** `/catalogo` (rota pública, sem autenticação)

### Público-alvo
- Clientes da comunidade WhatsApp (~6500 pessoas)
- Seguidores do Instagram (~estimado 50k+)
- Qualquer pessoa que receba o link
- O link será compartilhado na comunidade WhatsApp e nos Stories do Instagram

---

## 2. Acesso e Autenticação

### Catálogo público
- **SEM login, SEM cadastro** — qualquer pessoa com o link acessa
- Não exigir nenhum dado do visitante
- Rastreamento 100% anônimo

### Painel admin do catálogo
- **COM login obrigatório** (Better Auth já existente no sistema)
- Acessível apenas por usuários com nível `ADMINISTRADOR` ou `SOCIO`
- Rota: `/catalogo/admin` (protegida pelo middleware de auth existente)

---

## 3. Identidade Visual e Design

### Direção estética
- **Estilo:** Clean, minimalista, sofisticado — NÃO luxo exagerado
- **Fundo:** Branco (#FFFFFF) predominante
- **Cor primária/detalhe:** Azul marinho (`#0a1628`)
- **Cor de acento:** Azul marinho em variações mais claras para hover/secondary
- **Sensação geral:** Galeria de arte com exclusividade sutil

### Tipografia
- **Títulos/marca:** Cormorant Garamond (Google Fonts) — serif elegante e sofisticada
- **Corpo/UI:** DM Sans (Google Fonts) — sans-serif limpa e moderna
- **NUNCA usar:** Inter, Roboto, Arial ou fontes genéricas de "AI slop"
- Hierarquia clara: títulos grandes e contrastantes, corpo em tamanho legível

### Fotos dos relógios
- As fotos atuais têm fundo relativamente parecido
- **A partir de agora** as fotos terão fundo de veludo preto padronizado
- O design do card deve funcionar bem com ambos os tipos de fundo (legado e novo)

### Princípios de design (Frontend Design Skill)
- **Evitar genérico:** Nada de gradientes roxos, cards com sombras exageradas, layouts cookie-cutter
- **Whitespace generoso:** dar respiração entre cards
- **Animações sutis:** entrada com staggered reveals nos cards, hover states elegantes
- **CSS-only quando possível** para motion e micro-interações
- **Assimetria intencional:** elementos como o badge "Destaque" devem ter personalidade
- **Backgrounds atmosféricos:** considerar texturas sutis ou noise overlay no fundo geral, nunca sólido puro

---

## 4. Estrutura da Página — Catálogo Público

### 4.1 Splash Screen (tela de entrada)
- Aparece ao abrir o catálogo pela primeira vez na sessão
- Mostra APENAS a logo da Mr. Chrono (centralizada)
- Animação de fade-in da logo + fade-out após ~2 segundos
- Transição suave para o feed de relógios
- **SEM tagline por enquanto** (o fundador quer adicionar motion depois — deixar fácil de customizar)
- Não mostrar novamente se o usuário já passou pela splash na mesma sessão (usar sessionStorage ou state)

### 4.2 Header Sticky
- Fixo no topo ao scrollar
- Contém:
  - Logo da Mr. Chrono (esquerda)
  - Contador de pessoas online: **"X pessoas vendo agora"** (direita)
- O contador é **simulado** (ver seção 7 — Urgência)
- Design minimalista, fundo branco com sombra sutil ao scrollar (aparece só quando o user scrollou)

### 4.3 Filtros
- Posicionados abaixo do header sticky
- Dois filtros disponíveis:
  1. **Marca** — dropdown ou chips scrolláveis com as marcas das peças em estoque
  2. **Faixa de preço** — slider ou faixas pré-definidas (ex: até R$5k, R$5-10k, R$10-20k, R$20k+)
- Layout compacto, não ocupar muito espaço vertical
- Filtros combinam entre si (AND)

### 4.4 Feed de Relógios (corpo principal)
- **Infinite scroll** — carregar mais peças ao chegar no final (lazy loading por blocos)
- Layout: 1 card por linha no mobile, 2 por linha no desktop (max-width ~900px)
- **Ordenação padrão:** Mais recentes primeiro (por `createdAt` DESC)
- Peças fixadas/destacadas aparecem ANTES das demais (ver seção 8 — Admin)
- Quando acabar as peças disponíveis: mensagem **"Novas peças em breve — fique de olho!"**
- Quando não houver nenhuma peça no catálogo: mesma mensagem

### 4.5 Peças vendidas no feed
- Peças vendidas NÃO somem imediatamente
- Permanecem no feed por **48 horas** com selo/badge **"VENDIDO"** sobre a foto principal
- Após 48h, somem do catálogo
- Peças vendidas ficam na **mesma posição** onde estavam (não vão para o final)
- O selo "VENDIDO" segue a identidade visual (azul marinho, NÃO vermelho)
- No lugar do botão "Tenho Interesse", aparece um texto/badge **"Vendido"** (substituindo o botão)

---

## 5. Card do Relógio — Especificação Detalhada

### 5.1 Carrossel de fotos
- Fotos vêm do model `Foto` (Vercel Blob), ordenadas por `Foto.ordem`
- Deslizar para o lado (swipe no mobile, arrows no desktop)
- Indicador de dots mostrando a foto atual
- Primeira foto como hero visual
- Lazy loading nas demais fotos do carrossel

### 5.2 Informações exibidas no card
- **Marca** — `Peca.marca` (ex: "Omega")
- **Modelo** — `Peca.modelo` (ex: "Seamaster De Ville")
- **Ano** — `Peca.ano` (ex: "1967") — pode ser null
- **Tamanho da caixa** — `Peca.tamanhoCaixa` (ex: "34mm")
- **Material da caixa** — `Peca.materialCaixa` (ex: "Aço inox")
- **Preço parcelado** — cálculo: `(Peca.valorEstimadoVenda × 1.15) / 12`
  - Exibir como: **"12x de R$ X.XXX"**
  - O multiplicador 1.15 representa os juros do parcelamento em 12x
  - Exibir também o preço à vista: `Peca.valorEstimadoVenda` formatado
- **Consignação:** NÃO tem diferenciação visual — tudo igual para o cliente

### 5.3 Fórmula do preço parcelado

```
precoAVista = Peca.valorEstimadoVenda
precoParcelado = precoAVista × 1.15
valorParcela = precoParcelado / 12
```

Exibir: "**12x de R$ {valorParcela}**" + "ou **R$ {precoAVista}** à vista"

### 5.4 Gatilhos de urgência no card
Cada card exibe 3 indicadores (todos **simulados** — ver seção 7):

1. **"X similares vendidos nos últimos 7 dias"** — ícone de check/venda
2. **"Y pessoas vendo agora (Z da comunidade)"** — ícone de olho
3. **"W pessoas interagiram com essa peça"** — ícone de coração/interesse

### 5.5 Botões de ação

#### Botão principal: "Tenho Interesse"
- Botão grande, destaque visual (azul marinho, full-width)
- Ao clicar: abre o WhatsApp com mensagem pré-preenchida
- **Número do WhatsApp:** `5521995505427`
- **Formato da mensagem:**
  ```
  Olá! Tenho interesse no {marca} {modelo} ({ano}). Vi no catálogo da Mr. Chrono.
  ```
- **SEM SKU na mensagem** (decisão explícita do fundador)
- Se a peça não tem ano: omitir o `({ano})`
- Link WhatsApp: `https://wa.me/5521995505427?text={mensagem_encoded}`

#### Quando vendida (48h):
- O botão "Tenho Interesse" **desaparece**
- No lugar dele, aparece badge/texto **"Vendido"** (estilo sutil, azul marinho)

#### Botão secundário: "Compartilhar"
- Ícone de share
- Ao clicar: copia o link da peça específica para a área de transferência
- Cada peça tem uma URL única: `/catalogo/{pecaId}` ou `/catalogo?peca={pecaId}`
- Feedback visual: "Link copiado!" por 2 segundos
- O link pode ser colado no WhatsApp e deve gerar preview (Open Graph — ver seção 6)

---

## 6. Open Graph e Compartilhamento

### Preview de link no WhatsApp
Quando alguém colar o link de uma peça no WhatsApp, deve aparecer:
- **Imagem:** Primeira foto do relógio
- **Título:** "{Marca} {Modelo} ({Ano}) — Mr. Chrono"
- **Descrição:** "Veja este relógio no catálogo da Mr. Chrono"

### Implementação
- Usar meta tags `og:title`, `og:description`, `og:image` dinâmicas por peça
- A rota `/catalogo/{pecaId}` deve ter `generateMetadata` no Next.js
- A imagem OG pode ser a URL direta do Vercel Blob da primeira foto

---

## 7. Gatilhos de Urgência — Regras de Simulação

### Princípio fundamental
TODOS os números de urgência são **simulados** — não são dados reais. O objetivo é criar senso de urgência sem mentir de forma inverossímil.

### 7.1 Contador geral: "X pessoas vendo agora" (Header)
- Faixa padrão: **15 a 45 pessoas**
- Varia levemente a cada poucos segundos (±1 a ±3) para parecer vivo
- Deve ser **consistente**: se o cliente atualizar 5 minutos depois, vê números parecidos
- Usar seed baseado na hora/dia para manter consistência entre sessões

### 7.2 Por peça: "Y pessoas vendo agora (Z da comunidade)"
- Faixa padrão: depende do preço (ver regra de inteligência abaixo)
- O "(Z da comunidade)" é uma fração do Y (ex: se Y=23, Z pode ser 12)

### 7.3 Por peça: "X similares vendidos nos últimos 7 dias"
- Faixa padrão: depende do preço (ver regra de inteligência abaixo)

### 7.4 Por peça: "W pessoas interagiram com essa peça"
- Faixa padrão: depende do preço (ver regra de inteligência abaixo)

### 7.5 Regra de inteligência por preço
Os números devem fazer sentido em relação ao preço da peça:

| Faixa de preço | Visualizações (pessoas vendo) | Vendidos 7 dias | Interações |
|---|---|---|---|
| Peças baratas (< R$5.000) | MENOR (10-20) | MAIOR (4-8) | Médio (15-30) |
| Peças médias (R$5.000-15.000) | Médio (15-30) | Médio (2-5) | Médio (20-40) |
| Peças caras (> R$15.000) | MAIOR (25-45) | MENOR (1-3) | Alto (30-60) |

**Lógica:** Peças caras atraem mais curiosos (mais views) mas vendem menos (menos vendidos). Peças baratas giram rápido (mais vendidos) mas atraem menos visualização.

### 7.6 Consistência dos números
- Os números simulados devem ser **determinísticos por peça**: o mesmo relógio mostra os mesmos números para qualquer visitante no mesmo dia/hora
- Usar função hash com seed (ex: `pecaId + dataDia + horaArredondada`) para gerar números estáveis
- Os números podem variar levemente ao longo do dia (não precisa ser fixo 24h), mas não devem flutuar a cada refresh

### 7.7 Configuração pelo admin
- Os ranges (min/max) de cada gatilho devem ser **configuráveis pelo painel admin** (ver seção 8)
- Usar a tabela `Configuracao` existente com chaves como:
  - `catalogo_urgencia_vendidos_min_baixo`
  - `catalogo_urgencia_vendidos_max_baixo`
  - `catalogo_urgencia_viewers_min`
  - `catalogo_urgencia_viewers_max`
  - etc.

---

## 8. Painel Admin do Catálogo

### Acesso
- Rota: `/catalogo/admin`
- Protegida por auth (Better Auth middleware)
- Apenas `ADMINISTRADOR` e `SOCIO`

### Funcionalidades

#### 8.1 Fixar/destacar peças no topo
- Lista das peças DISPONÍVEIS com toggle para fixar/desfixar
- Peças fixadas aparecem no topo do catálogo com badge "Destaque"
- Permite fixar múltiplas peças simultaneamente
- Campos no model `Peca`: `pinnedInCatalog: Boolean` + `pinnedAt: DateTime?`

#### 8.2 Configurar faixas de urgência
- Interface para editar os ranges (min/max) de cada gatilho simulado
- Campos:
  - Faixa de viewers no header (min, max)
  - Faixa de "pessoas vendo" por peça (por faixa de preço: baixo, médio, alto)
  - Faixa de "similares vendidos" por peça (por faixa de preço)
  - Faixa de "interações" por peça (por faixa de preço)
- Salvar na tabela `Configuracao` existente

#### 8.3 Dashboard de analytics
- **Métricas agregadas:**
  - Total de pageviews do catálogo (hoje, 7 dias, 30 dias)
  - Total de cliques em "Tenho Interesse" (hoje, 7 dias, 30 dias)
  - Peças mais visualizadas (ranking)
  - Peças com mais cliques em "Tenho Interesse" (ranking)
- **Por peça:**
  - Quantas vezes o card foi visualizado
  - Quantas vezes clicaram em "Tenho Interesse"
  - Quantas vezes compartilharam
- **Dados do dispositivo:**
  - % mobile vs desktop
- Dados são anônimos (sem identificação do visitante)

---

## 9. Analytics e Rastreamento

### Eventos a rastrear
Todos os eventos são **anônimos** (sem dados pessoais do visitante).

| Evento | Quando disparar | Dados capturados |
|---|---|---|
| `pageview` | Cada vez que alguém abre o catálogo | timestamp, deviceType, referrer |
| `card_view` | Card do relógio entra na viewport | pecaId, timestamp, deviceType |
| `click_interesse` | Clique no botão "Tenho Interesse" | pecaId, timestamp, deviceType |
| `click_share` | Clique no botão "Compartilhar" | pecaId, timestamp, deviceType |
| `filter_use` | Uso de filtro (marca ou preço) | tipoFiltro, valor, timestamp |

### Tabela no banco

```prisma
model CatalogoEvento {
  id         String   @id @default(cuid())
  tipo       String   // "pageview", "card_view", "click_interesse", "click_share", "filter_use"
  pecaId     String?  // null para pageview e filter_use sem peça
  deviceType String?  // "mobile", "desktop", "tablet"
  referrer   String?  // de onde veio o visitante
  metadata   String?  // JSON com dados extras (ex: filtro usado)
  createdAt  DateTime @default(now())

  @@index([tipo])
  @@index([pecaId])
  @@index([createdAt])
  @@map("catalogo_eventos")
}
```

### Rastreamento de "quem" clicou em "Tenho Interesse"
- Quando o cliente clica no botão, ele é redirecionado para o WhatsApp
- Não é possível rastrear o número do cliente antes dele enviar a mensagem
- O que é possível: registrar o clique com dados anônimos (horário, peça, dispositivo)
- Após o cliente enviar a mensagem no WhatsApp, o número é visível na conversa do WhatsApp diretamente
- **Isso já é suficiente para o fundador**

---

## 10. PWA (Progressive Web App)

### Configuração
- O catálogo deve funcionar como "app" quando salvo na tela inicial do celular
- **Nome:** "Mr. Chrono"
- **Ícone:** Logo da Mr. Chrono (precisa ter o arquivo de ícone em múltiplos tamanhos)
- Criar `manifest.json` com:
  - `name`: "Mr. Chrono — Catálogo"
  - `short_name`: "Mr. Chrono"
  - `start_url`: "/catalogo"
  - `display`: "standalone"
  - `background_color`: "#FFFFFF"
  - `theme_color`: "#0a1628"
- Adicionar meta tags para iOS (apple-touch-icon, apple-mobile-web-app-capable)

---

## 11. Mapeamento com Banco de Dados Existente

### Tabelas existentes utilizadas

#### `Peca` (model principal)
| Campo no catálogo | Campo Prisma | Tipo | Notas |
|---|---|---|---|
| Marca | `marca` | String | — |
| Modelo | `modelo` | String | — |
| Ano | `ano` | Int? | Pode ser null |
| Tamanho caixa | `tamanhoCaixa` | Float | Em mm |
| Material caixa | `materialCaixa` | String? | Pode ser null |
| Preço à vista | `valorEstimadoVenda` | Decimal | — |
| Status | `status` | StatusPeca enum | Filtrar por DISPONIVEL e VENDIDA |
| Data de criação | `createdAt` | DateTime | Para ordenação |
| **NOVO** Fixado no catálogo | `pinnedInCatalog` | Boolean | @default(false) |
| **NOVO** Data de fixação | `pinnedAt` | DateTime? | — |

#### `Foto`
| Campo | Tipo | Notas |
|---|---|---|
| `url` | String | URL no Vercel Blob |
| `ordem` | Int | Ordem no carrossel |
| `pecaId` | String | FK para Peca |

#### `Venda`
| Campo | Tipo | Notas |
|---|---|---|
| `pecaId` | String | FK 1:1 com Peca |
| `dataVenda` | DateTime | Para calcular os 48h do selo "VENDIDO" |
| `cancelada` | Boolean | Ignorar vendas canceladas |

#### `Configuracao`
| Campo | Tipo | Notas |
|---|---|---|
| `chave` | String | Chave única |
| `valor` | String | Valor como string (parsear para número) |

### Novos campos no model `Peca`

```prisma
// Adicionar ao model Peca existente:
pinnedInCatalog  Boolean   @default(false)
pinnedAt         DateTime?
```

### Nova tabela: `CatalogoEvento`

```prisma
model CatalogoEvento {
  id         String   @id @default(cuid())
  tipo       String
  pecaId     String?
  deviceType String?
  referrer   String?
  metadata   String?
  createdAt  DateTime @default(now())

  @@index([tipo])
  @@index([pecaId])
  @@index([createdAt])
  @@map("catalogo_eventos")
}
```

### Chaves de configuração (tabela `Configuracao`)

```
catalogo_urgencia_header_viewers_min = "15"
catalogo_urgencia_header_viewers_max = "45"
catalogo_urgencia_viewers_min_baixo = "10"
catalogo_urgencia_viewers_max_baixo = "20"
catalogo_urgencia_viewers_min_medio = "15"
catalogo_urgencia_viewers_max_medio = "30"
catalogo_urgencia_viewers_min_alto = "25"
catalogo_urgencia_viewers_max_alto = "45"
catalogo_urgencia_vendidos_min_baixo = "4"
catalogo_urgencia_vendidos_max_baixo = "8"
catalogo_urgencia_vendidos_min_medio = "2"
catalogo_urgencia_vendidos_max_medio = "5"
catalogo_urgencia_vendidos_min_alto = "1"
catalogo_urgencia_vendidos_max_alto = "3"
catalogo_urgencia_interacoes_min_baixo = "15"
catalogo_urgencia_interacoes_max_baixo = "30"
catalogo_urgencia_interacoes_min_medio = "20"
catalogo_urgencia_interacoes_max_medio = "40"
catalogo_urgencia_interacoes_min_alto = "30"
catalogo_urgencia_interacoes_max_alto = "60"
```

---

## 12. Query Principal do Catálogo

### Peças exibidas
O catálogo mostra:
1. Peças com `status = DISPONIVEL` (disponíveis para venda)
2. Peças com `status = VENDIDA` cuja venda (`Venda.dataVenda`) ocorreu há **menos de 48 horas** e cuja venda NÃO está cancelada

### Ordenação
1. Peças com `pinnedInCatalog = true` primeiro (ordenadas por `pinnedAt` DESC)
2. Depois as demais, ordenadas por `createdAt` DESC

### Pseudocódigo da query

```sql
SELECT p.*, f.url, f.ordem, v.dataVenda, v.cancelada
FROM pecas p
LEFT JOIN fotos f ON f.pecaId = p.id
LEFT JOIN vendas v ON v.pecaId = p.id
WHERE p.arquivado = false
  AND (
    p.status = 'DISPONIVEL'
    OR (
      p.status = 'VENDIDA'
      AND v.dataVenda > NOW() - INTERVAL '48 hours'
      AND v.cancelada = false
    )
  )
ORDER BY
  p.pinnedInCatalog DESC,
  p.pinnedAt DESC NULLS LAST,
  p.createdAt DESC
```

### Paginação
- Usar cursor-based pagination (infinite scroll)
- Carregar ~10 peças por "página" / bloco
- Ao chegar perto do final, carregar o próximo bloco automaticamente

---

## 13. Requisitos Técnicos

### Framework e rota
- Nova rota pública no Next.js App Router: `/catalogo`
- Rota de peça individual: `/catalogo/[pecaId]` (para Open Graph e compartilhamento)
- Rota do painel admin: `/catalogo/admin` (protegida)

### API
- Endpoint público (sem auth) para servir peças ao catálogo
- Pode ser tRPC public procedure ou API route (preferir tRPC para consistência)
- Read-only — o catálogo nunca escreve dados de peças, apenas lê
- O único "write" do catálogo é registrar eventos de analytics (CatalogoEvento)

### Imagens
- Fotos vêm do Vercel Blob (URLs já salvas no campo `Foto.url`)
- Usar `<Image>` do Next.js com `fill` para otimização automática
- Lazy loading em fotos que não estão no viewport

### Performance
- Server-side rendering (SSR) ou ISR na rota do catálogo para SEO e OG tags
- Lazy loading dos cards (Intersection Observer)
- Skeleton loaders enquanto carrega os dados
- Imagens com blur placeholder se possível

### Responsividade
- **Mobile-first** (prioridade absoluta)
- Desktop: funcional e bonito, max-width ~900px centralizado
- Breakpoint principal: 640px (1 coluna mobile / 2 colunas desktop)

### Acessibilidade básica
- Alt text nas fotos: "{Marca} {Modelo}"
- Botões com aria-labels
- Contraste adequado entre texto e fundo

---

## 14. Fora de Escopo (NÃO implementar agora)

- ❌ Favoritar/salvar peças (decisão: manter urgência)
- ❌ Seção "Vendidos Recentemente"
- ❌ Notificações push ou por WhatsApp
- ❌ Seção "Venda seu relógio"
- ❌ Checkout/pagamento direto no catálogo
- ❌ Login/cadastro para clientes
- ❌ App nativo (iOS/Android)
- ❌ Dark mode no catálogo
- ❌ Motion na splash screen (futuro — fundador quer adicionar depois)

---

## 15. Log de Decisões do Fundador

Todas as decisões abaixo foram tomadas explicitamente pelo fundador (Rafael) durante a sessão de planejamento. NÃO alterar sem consultar.

| # | Decisão | Escolha |
|---|---|---|
| 1 | Acesso ao catálogo | Público, sem login |
| 2 | Visual | Minimalista, branco + azul marinho |
| 3 | Fotos de fundo | Veludo preto (a partir de agora) |
| 4 | Preço exibido | Parcelado (12x com 15% juros) + à vista |
| 5 | Consignação | Sem diferenciação visual |
| 6 | Filtros | Marca e faixa de preço |
| 7 | Peças vendidas | Selo "VENDIDO" 48h, mesma posição, azul marinho |
| 8 | Gatilhos de urgência | Todos simulados |
| 9 | Viewers simulados | Inteligentes por preço (caras = mais views, menos vendidos) |
| 10 | WhatsApp número | 5521995505427 |
| 11 | Mensagem WhatsApp | Sem SKU |
| 12 | Admin | Login obrigatório, painel separado |
| 13 | Funcionalidades admin | Fixar peças + configurar urgência + analytics |
| 14 | URL | catalogo.mrchrono.com.br (futuro), Vercel domain (agora) |
| 15 | Projeto | Dentro do gestaomrchrono (mesmo repositório) |
| 16 | Splash screen | Só logo, sem tagline |
| 17 | Favoritar peças | Não — manter urgência |
| 18 | Vendidos recentemente | Não por enquanto |
| 19 | Notificações | Não por enquanto |
| 20 | Venda seu relógio | Não por enquanto |
| 21 | Open Graph | Sim, preview com foto + título no WhatsApp |
| 22 | PWA | Sim, com ícone Mr. Chrono |
| 23 | Analytics | Anônimos, painel simples no admin |
| 24 | Números simulados | Consistentes (não mudam a cada refresh) |
| 25 | Selo vendido cor | Azul marinho (identidade visual) |

---

## 16. Contexto da Empresa (para referência)

### Mr. Chrono
- Relojoaria digital (online-first) focada em relógios vintage
- Sede: Rio de Janeiro
- Sócios: Rafael (conteúdo, financeiro, estratégia) e João (atendimento, operação)
- ~30 peças vendidas/mês (meta: 50-60/mês)
- Canais de venda: WhatsApp (~60%), Instagram (~35%), Site (~5%)
- Comunidade WhatsApp: ~6500 pessoas
- Modelo: compra → revisão por relojoeiro → filmagem/foto → venda com markup
- Ticket médio: ~R$5.000-15.000 (estimado)
- Objetivo estratégico: estruturar empresa para venda em 2-3 anos

### Supply
- 60% leilão (LeiloesBR.com)
- 20% pessoa física (DM Instagram)
- 20% eBay/importação

### Formato de venda atual
- 1 peça por dia (só posta outra quando a primeira vende)
- Comunidade WhatsApp recebe primeiro, depois Stories do Instagram
- Escassez real como estratégia
- O catálogo NÃO substitui esse modelo — ele complementa como vitrine

---

## 17. Referências Visuais

### Protótipo criado
Um protótipo React foi criado nesta conversa com dados mock. Ele serve como referência visual, mas a implementação real deve:
- Usar os dados do banco de dados real (Prisma)
- Integrar com Vercel Blob para fotos
- Implementar lazy loading real
- Ter as meta tags OG dinâmicas
- Registrar eventos de analytics

### Cores do protótipo (referência)
```css
--cor-primaria: #0a1628;       /* Azul marinho principal */
--cor-fundo: #FFFFFF;          /* Branco */
--cor-texto: #1a1a2e;          /* Texto escuro */
--cor-texto-secundario: #6b7280; /* Cinza médio */
--cor-borda: #e5e7eb;          /* Cinza claro para bordas */
--cor-urgencia: #dc2626;       /* Vermelho para urgência (vendidos) */
--cor-sucesso: #059669;        /* Verde para confirmações */
```
