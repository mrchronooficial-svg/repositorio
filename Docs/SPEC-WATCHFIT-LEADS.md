# MR Chrono — Formulário Watch Fit + Módulo de Leads

## Visão Geral do Projeto

Criar dois entregáveis integrados para o sistema MR Chrono:

1. **Formulário público "Watch Fit + Encomenda"** — página standalone acessível por link externo para captação de leads interessados em curadoria e encomenda de relógios.
2. **Módulo "Leads"** — nova seção no menu lateral do painel administrativo existente da MR Chrono, exibindo e organizando todos os dados captados pelo formulário.

---

## 1. Formulário Watch Fit + Encomenda

### 1.1 Objetivo e Tom

O formulário é a porta de entrada do cliente para o universo MR Chrono. Deve transmitir **sofisticação, confiança e exclusividade** — o mesmo sentimento de entrar numa relojoaria de alto padrão.

**Texto de abertura (sugestão refinada):**

> **Watch Fit — Curadoria & Encomenda**
>
> Cada pulso conta uma história. O Watch Fit é a nossa ferramenta de curadoria personalizada — com ele, entendemos exatamente o que você procura para apresentar, em primeira mão, os relógios que fazem sentido para o seu estilo e coleção. Seja uma peça específica ou uma descoberta sob medida, estamos aqui para encontrar o relógio certo para você.

### 1.2 Design & Estética

**Direção visual:** Luxury minimal — inspirado em maisons relojoeiras (Hodinkee, Chrono24 premium, Watches of Switzerland).

- **Paleta de cores:**
  - Background principal: off-white/creme (#F5F3EF ou similar)
  - Texto: preto profundo (#1A1A1A)
  - Acentos: dourado sutil (#B8960C) ou bronze (#8B6914)
  - Campos de input: borda fina cinza claro, fundo branco
  - Botões: preto sólido com texto branco, hover com dourado
- **Tipografia:**
  - Títulos/headings: fonte serif elegante (ex: `Playfair Display`, `Cormorant Garamond`, `EB Garamond`)
  - Corpo/labels/inputs: fonte sans-serif refinada (ex: `DM Sans`, `Outfit`, `Satoshi`)
  - Evitar fontes genéricas como Inter, Roboto, Arial
- **Layout:**
  - Formulário centralizado, largura máxima ~640px
  - Espaçamento generoso entre seções (mínimo 32px)
  - Inputs altos e confortáveis (min-height: 48px)
  - Transições suaves entre etapas (fade ou slide)
  - Logo MR Chrono no topo
  - Mobile-first, 100% responsivo
- **Interações:**
  - Animação sutil de entrada (fade-in stagger dos campos)
  - Labels flutuantes ou acima do campo
  - Validação inline discreta (bordas e ícones, sem alertas intrusivos)
  - Feedback visual ao selecionar opções (cards com borda dourada, check sutil)
  - Loading state elegante no botão de envio
  - Tela de confirmação/sucesso após envio com mensagem personalizada

### 1.3 Estrutura do Formulário

O formulário deve ser multi-step (wizard) com barra de progresso sutil no topo.

#### Step 1 — Dados Pessoais

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome completo | text input | ✅ |
| E-mail | email input | ✅ |
| WhatsApp (com DDI) | tel input com máscara | ✅ |
| Instagram (opcional) | text input com prefixo @ | ❌ |

#### Step 2 — Tipo de Busca

**Pergunta principal:** "Já tem um modelo específico que esteja procurando?"

Apresentar como dois cards clicáveis:

- **"Sim, tenho um modelo em mente"** → redireciona para Step 3A
- **"Não, quero descobrir opções"** → redireciona para Step 3B

#### Step 3A — Modelo Específico (Encomenda)

Exibido apenas se o usuário escolheu "Sim":

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Marca | select/dropdown com busca (lista abaixo) | ✅ |
| Modelo | text input | ✅ |
| Tamanho da caixa | text input (ex: "41mm") | ❌ |
| Número de referência | text input | ❌ |
| Condição desejada | select: "Completo (box + docs)", "Somente relógio", "Tanto faz" | ✅ |
| Link de exemplo | url input | ❌ |
| Observações | textarea (max 500 chars, com contador) | ❌ |

**Lista de marcas para o dropdown (ordenar alfabeticamente):**
Audemars Piguet, Bell & Ross, Blancpain, Breguet, Breitling, Bulgari, Cartier, Chopard, F.P. Journe, Girard-Perregaux, Grand Seiko, Hublot, IWC, Jaeger-LeCoultre, Longines, Montblanc, Nomos, Omega, Panerai, Patek Philippe, Piaget, Richard Mille, Rolex, Seiko, TAG Heuer, Tudor, Ulysse Nardin, Vacheron Constantin, Zenith, Outra (campo aberto)

#### Step 3B — Descoberta / Curadoria

Exibido apenas se o usuário escolheu "Não":

| Campo | Tipo | Opções |
|-------|------|--------|
| Estilo | multi-select (cards visuais) | Vintage, Moderno |
| Marcas de interesse | multi-select (chips/tags clicáveis) | Mesma lista de marcas acima — permitir múltipla seleção |
| Tipo de pulseira | multi-select (cards com ícone) | Aço, Couro, Borracha/Silicone, Nato/Tecido, Jubilee, Presidencial |
| Cor do mostrador | multi-select (color swatches clicáveis) | Preto, Branco, Azul, Verde, Champagne/Dourado, Cinza/Prata, Outra |
| Tamanho de caixa preferido | select | "Até 36mm", "37–39mm", "40–42mm", "43mm+", "Sem preferência" |
| Faixa de investimento | select | "Até R$5.000", "R$5.000–R$15.000", "R$15.000–R$30.000", "R$30.000–R$60.000", "R$60.000–R$100.000", "Acima de R$100.000", "Prefiro não informar" |
| Observações | textarea (max 500 chars) | — |

#### Step 4 — Confirmação

- Resumo visual dos dados preenchidos (card com as infos organizadas)
- Checkbox: "Concordo em receber comunicações da MR Chrono via WhatsApp e e-mail"
- Botão de envio: **"Enviar meu Watch Fit"**

#### Tela de Sucesso

Após envio bem-sucedido:

> **Recebemos seu Watch Fit!**
>
> Nossa equipe já está analisando seu perfil. Em breve entraremos em contato com as melhores opções para você.
>
> Enquanto isso, acompanhe nossas novidades no Instagram: **@mrchrono**

Botão: "Voltar ao site" (link configurável)

### 1.4 Dados e Integração

- Todos os envios devem ser salvos no banco de dados do sistema MR Chrono
- Estrutura de dados do lead:

```json
{
  "id": "uuid",
  "created_at": "timestamp",
  "status": "novo",
  "dados_pessoais": {
    "nome": "",
    "email": "",
    "whatsapp": "",
    "instagram": ""
  },
  "tipo_busca": "especifico" | "descoberta",
  "modelo_especifico": {
    "marca": "",
    "modelo": "",
    "tamanho_caixa": "",
    "numero_referencia": "",
    "condicao": "",
    "link_exemplo": "",
    "observacoes": ""
  },
  "descoberta": {
    "estilo": [],
    "marcas_interesse": [],
    "tipo_pulseira": [],
    "cor_mostrador": [],
    "tamanho_caixa": "",
    "faixa_investimento": "",
    "observacoes": ""
  },
  "aceite_comunicacao": true | false
}
```

---

## 2. Módulo "Leads" no Painel Administrativo

### 2.1 Menu Lateral

Adicionar novo item no sidebar do sistema existente:

- **Ícone:** ícone de usuário com "+" ou ícone de funil (usar Lucide icons se o projeto já usa, ou a lib de ícones do projeto)
- **Label:** "Leads"
- **Posição:** abaixo dos itens principais existentes, antes de configurações
- **Badge:** contador de leads com status "novo" (ex: bolinha vermelha com número)

### 2.2 Tela Principal — Lista de Leads

**Layout:** Tabela/lista com filtros e busca no topo.

**Header da página:**
- Título: "Leads — Watch Fit"
- Subtítulo: "Gerencie os leads captados pelo formulário Watch Fit"
- Botão: "Copiar link do formulário" (copia URL pública)
- Indicador: total de leads e novos leads

**Filtros (barra horizontal acima da tabela):**
- Busca por nome/email/WhatsApp
- Status: Todos, Novo, Em contato, Negociando, Convertido, Arquivado
- Tipo: Todos, Modelo Específico, Descoberta
- Data: período (de/até)
- Marca de interesse (select múltiplo)

**Colunas da tabela:**

| Coluna | Descrição |
|--------|-----------|
| Nome | nome do lead |
| Tipo | badge "Encomenda" ou "Curadoria" |
| Marca(s) | principal marca ou lista resumida |
| Status | badge colorido com o status atual |
| WhatsApp | número com botão de link direto (wa.me) |
| Data | data de envio, formato relativo ("há 2h", "ontem") |
| Ações | ver detalhes, alterar status, arquivar |

**Funcionalidades da tabela:**
- Ordenação por data (padrão: mais recente primeiro)
- Paginação ou scroll infinito
- Seleção múltipla para ações em lote (alterar status, arquivar)
- Linha clicável abre o detalhe do lead

### 2.3 Tela de Detalhe do Lead

Ao clicar em um lead, abrir painel lateral (drawer) ou página de detalhe com:

**Cabeçalho:**
- Nome do lead (grande)
- Status atual (dropdown para alterar inline)
- Data de criação
- Botões de ação rápida: "Abrir WhatsApp", "Enviar e-mail", "Abrir Instagram"

**Seções do detalhe:**

1. **Dados Pessoais**
   - Nome, e-mail, WhatsApp, Instagram
   - Aceite de comunicação (sim/não)

2. **Watch Fit — Preferências**
   - Se tipo "Encomenda": exibir marca, modelo, ref, tamanho, condição, link, observações
   - Se tipo "Curadoria": exibir estilo, marcas, pulseiras, cores, tamanho, faixa de investimento, observações
   - Mostrar de forma visual (tags coloridas para multi-selects, cards para as preferências)

3. **Notas Internas** (campo para a equipe MR Chrono)
   - Textarea para adicionar anotações
   - Histórico de notas com data/hora e autor
   - Cada nota salva fica listada em ordem cronológica reversa

4. **Histórico de Status**
   - Timeline visual das mudanças de status
   - Ex: "Novo → Em contato (22/04/2026 às 14:30)"

### 2.4 Status dos Leads

Sistema de status com cores:

| Status | Cor | Descrição |
|--------|-----|-----------|
| Novo | azul | Lead recém-captado, não contactado |
| Em contato | amarelo/âmbar | Equipe já entrou em contato |
| Negociando | roxo | Conversa ativa sobre peça(s) |
| Convertido | verde | Lead virou venda |
| Arquivado | cinza | Lead descartado ou inativo |

### 2.5 Dados e API

**Endpoints necessários (REST):**

```
GET    /api/leads              — listar leads (com query params para filtro, paginação, ordenação)
GET    /api/leads/:id          — detalhe de um lead
POST   /api/leads              — criar lead (usado pelo formulário público)
PATCH  /api/leads/:id          — atualizar status, adicionar notas
DELETE /api/leads/:id          — arquivar/deletar lead
GET    /api/leads/stats        — contadores (total, novos, por status)
```

**Observações técnicas:**
- O endpoint POST /api/leads deve ser público (sem autenticação) para o formulário funcionar
- Os demais endpoints devem exigir autenticação do painel admin
- Implementar rate limiting no endpoint público para evitar spam
- Validação de e-mail e telefone no backend

---

## 3. Requisitos Técnicos Gerais

- **Seguir a stack e padrões do projeto existente** — verificar framework (Next.js, React, etc.), ORM, banco de dados, lib de componentes já em uso e seguir os mesmos padrões.
- **Responsividade:** formulário e módulo admin devem funcionar perfeitamente em mobile e desktop.
- **Acessibilidade:** labels em todos os inputs, navegação por teclado, contraste adequado.
- **Performance:** formulário deve carregar rápido (lazy load se necessário), sem dependências pesadas desnecessárias.
- **Segurança:** sanitização de inputs, rate limiting no endpoint público, CSRF protection.

---

## 4. Checklist de Implementação

- [ ] Criar model/schema de Lead no banco de dados
- [ ] Criar endpoints da API de leads
- [ ] Criar página pública do formulário Watch Fit (multi-step, responsivo, animado)
- [ ] Conectar formulário ao endpoint POST /api/leads
- [ ] Adicionar item "Leads" no menu lateral do painel admin
- [ ] Criar página de listagem de leads com filtros e busca
- [ ] Criar painel/página de detalhe do lead
- [ ] Implementar sistema de status com histórico
- [ ] Implementar notas internas
- [ ] Implementar badge de contador no menu lateral
- [ ] Testes básicos dos endpoints
- [ ] Responsividade do formulário e do módulo admin
