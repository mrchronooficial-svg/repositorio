# Mr. Chrono — Base de Conhecimento Completa do Módulo Financeiro

> **Versão:** 1.0 | **Data:** Fevereiro 2026
> **Propósito:** Centralizar 100% das decisões, regras de negócio e definições técnicas para implementação do módulo financeiro via Claude Code.
> **Status:** Documento vivo — atualizar conforme novas decisões forem tomadas.

---

## 1. SOBRE A EMPRESA

### 1.1 Identidade

- **Nome:** Mr. Chrono
- **O que faz:** Relojoaria digital (online-first) de compra e venda de relógios vintage/segunda mão com curadoria.
- **Sede:** Rio de Janeiro, RJ
- **CNPJ:** LTDA
- **CNAE:** 47.83-1-02 — Comércio varejista de artigos de relojoaria
- **Regime tributário:** Simples Nacional — Anexo I (Comércio)
- **Sócios:** Rafael (50%) e João (50%). Não há pró-labore — toda remuneração é via distribuição de lucros.
- **Funcionários:** Zero. Operação 100% dos sócios.
- **Site:** www.mrchrono.com.br (pouco usado hoje)

### 1.2 Divisão de Responsabilidades

| Sócio | Responsabilidades |
|-------|-------------------|
| **Rafael** | Financeiro (DRE, gestão de estoque), filmagens/fotos, criação de conteúdo, gestão de Ads, estratégia de crescimento, embala e despacha peças |
| **João** | Atendimento (WhatsApp e Instagram), posta anúncios na comunidade, negocia e bida em leilões, contato com relojoeiro e importador eBay |

### 1.3 Canais de Venda

| Canal | % das vendas | Detalhes |
|-------|-------------|----------|
| **WhatsApp (comunidade)** | ~60% | ~6.500 pessoas em grupos. Recebem peças antes do Instagram |
| **Instagram Stories** | ~35% | Conteúdo audiovisual de alta qualidade |
| **Site** | ~5% | mrchrono.com.br — pouco relevante hoje |

### 1.4 Canais de Aquisição de Peças (Supply)

| Canal | % do supply | Detalhes |
|-------|------------|----------|
| **Leilão (LeiloesBR.com)** | ~60% | Online, quase diário. Taxa de 5% (buyer's premium) já incluída no custo inputado. ~30% das peças precisam restauro |
| **Pessoa Física** | ~20% | Via DM no Instagram ou Ads de "compramos seu relógio". Peça é enviada, autenticada pelo relojoeiro, pagamento à vista após aprovação |
| **eBay/Importação** | ~20% | Compra no eBay em USD, envia para importador que traz ao Brasil. Custo de importação: 10% (pagamento antecipado) ou 20% (pagamento posterior). Fornecedor registrado como "Mr. Chrono" no sistema |

### 1.5 Métricas Operacionais Atuais

- **Volume atual:** ~25-35 peças/mês vendidas
- **Objetivo:** 50-60 peças/mês
- **Ticket médio:** ~R$4.500-6.300 (varia por mês)
- **Lucro líquido médio por peça:** ~R$1.600-2.500
- **Margem líquida média:** ~30-50%
- **Estoque médio:** ~46 peças (apenas ~15 prontas para venda, resto em transporte ou relojoeiro)
- **Tempo médio de venda após anúncio:** ~15-20 dias
- **Peças encalhadas:** ~5 (sem critério formal de liquidação — reanunciam com desconto crescente)
- **Taxa de devolução/reclamação:** ~10%
- **Clientes recorrentes:** ~10-15%

### 1.6 Contas Bancárias PJ

| Conta | Banco | Finalidade |
|-------|-------|-----------|
| **Conta principal** | Nubank | Recebe Pix, paga despesas (default para saídas) |
| **Conta cartão** | PagBank | Recebe pagamentos em cartão de crédito |

- Transferências interbancárias acontecem (PagBank → Nubank). Sem taxa. Registro apenas como movimentação (débito/crédito) sem impacto na DRE.
- Compras de peças SEMPRE saem da conta PJ (nunca PF).
- Default de saída: Nubank.

### 1.7 Visão Estratégica

- **Horizonte:** Estruturar empresa para torná-la **vendável em 2-3 anos**.
- **Gargalos identificados:** Supply de peças em boa condição, demanda (crescer base de seguidores/WhatsApp), velocidade do relojoeiro.
- **Valuation desejado:** ~20x lucro forward (estimativa do Rafael).

---

## 2. ESCOPO DO MÓDULO FINANCEIRO

### 2.1 O Que o Módulo Faz

O módulo financeiro é um sistema integrado de contabilidade gerencial e fiscal que:

1. **Recebe automaticamente** dados dos módulos já existentes (estoque, vendas, recebíveis, fornecedores)
2. **Permite input manual** de custos, despesas, CAPEX, distribuição de lucros, etc.
3. **Permite despesas recorrentes programadas** (valor fixo mensal, lançadas automaticamente no último dia do mês)
4. **Gera automaticamente** os 3 demonstrativos: DRE, Balanço Patrimonial e DFC
5. **Permite gestão completa do Plano de Contas** (adicionar, editar, excluir contas)

### 2.2 O Que o Módulo NÃO Faz

- NÃO calcula depreciação de ativos (sem CAPEX automático)
- NÃO faz budget vs actual
- NÃO tem centros de custo (visão consolidada)
- NÃO gera KPIs operacionais (followers, churn, etc.) — isso fica em dashboard separado
- NÃO capitaliza investimentos em sistema/marca/site (tudo é despesa do período)

### 2.3 Dados Herdados do Sistema Existente

| Dado | Origem | Uso no Módulo Financeiro |
|------|--------|-------------------------|
| Peças em estoque (custo unitário) | Módulo de Estoque | Ativo — Estoques (Balanço) e CMV (DRE) |
| Vendas realizadas (valor, data, meio pagamento) | Módulo de Vendas | Receita Bruta (DRE), Contas a Receber (Balanço) |
| Recebíveis de clientes (parcelas) | Módulo de Vendas | Contas a Receber (Balanço), Fluxo de Caixa |
| Fornecedores de consignação (a pagar) | Módulo de Estoque | Passivo — Repasse Consignação (Balanço) |
| Custo de aquisição por peça | Módulo de Estoque | CMV (DRE) |
| Custo de manutenção/restauro por peça | Módulo de Estoque | CMV (DRE) |
| Faturamento (receita) por peça | Módulo de Vendas | Receita Bruta (DRE) |

### 2.4 Controle de Acesso

- Apenas usuários com perfil **Administrador** têm acesso ao módulo financeiro.

---

## 3. PLANO DE CONTAS COMPLETO (CPC/CFC)

O plano de contas segue padrão contábil brasileiro com codificação hierárquica. O sistema deve permitir ao administrador: **adicionar, editar, excluir** (apenas contas sem lançamentos) e **reordenar** contas.

### 3.1 Grupo 1 — ATIVO

```
1       ATIVO
1.1       Ativo Circulante
1.1.1       Caixa e Equivalentes de Caixa
1.1.1.01       Nubank (Pix)                    ← Conta PJ principal
1.1.1.02       PagBank (Cartão)                ← Conta PJ cartão
1.1.2       Contas a Receber
1.1.2.01       Clientes — Vendas a Prazo       ← Parcelas futuras cartão
1.1.3       Estoques
1.1.3.01       Peças (Relógios) — Estoque Próprio  ← Custo aquisição + manutenção/restauro
1.1.3.02       Material de Embalagem           ← Caixas, cartões
1.2       Ativo Não Circulante
1.2.1       Imobilizado                        ← Reservado para uso futuro
```

### 3.2 Grupo 2 — PASSIVO E PATRIMÔNIO LÍQUIDO

```
2       PASSIVO
2.1       Passivo Circulante
2.1.1       Fornecedores
2.1.1.01       Repasse — Consignação           ← Passivo gerado na venda de peça consignada
2.1.2       Obrigações Fiscais
2.1.2.01       Simples Nacional a Recolher     ← Imposto do mês a pagar
2.1.3       Outras Obrigações                  ← Reservado
2.2       Passivo Não Circulante               ← Vazio por enquanto
2.3       Patrimônio Líquido
2.3.1       Capital Social
2.3.2       Lucros Acumulados                  ← Resultado acumulado
2.3.3       Distribuição de Lucros (redutora)  ← Retiradas dos sócios (geralmente 50/50)
```

### 3.3 Grupo 3 — RECEITAS

```
3       RECEITAS
3.1       Receita Bruta de Vendas
3.1.1       Venda de Peças — Estoque Próprio
3.1.2       Venda de Peças — Consignação (margem)  ← Apenas: preço venda − repasse
3.2       (−) Deduções da Receita
3.2.1       (−) MDR — Taxa de Cartão               ← 4% sobre vendas em cartão
3.2.2       (−) Simples Nacional                    ← Alíquota conforme RBT12
3.3       = Receita Líquida                         ← Calculada automaticamente
```

### 3.4 Grupo 4 — CUSTOS E DESPESAS

```
4       CUSTOS E DESPESAS
4.1       Custo das Mercadorias Vendidas (CMV)
4.1.1       Custo de Aquisição — Leilão        ← Inclui buyer's premium 5% (já no valor inputado)
4.1.2       Custo de Aquisição — eBay          ← Inclui comissão do importador (10-20%)
4.1.3       Custo de Aquisição — Pessoa Física
4.1.4       Manutenção e Restauro              ← Revisão relojoeiro + restauro mostrador = COGS
4.2       Despesas Operacionais
4.2.1       Marketing e Publicidade (Ads)      ← Instagram Ads
4.2.2       Frete de Envio ao Cliente          ← Sedex + motoboy R$40/viagem = DESPESA (não COGS)
4.2.3       Editor de Vídeo                    ← R$75/edição (terceirizado)
4.2.4       Contabilidade                      ← Escritório contábil mensal
4.2.5       Dacto
4.2.6       Ferramentas e Sistemas
4.2.6.01       Manychat
4.2.6.02       Poli Digital
4.2.6.03       Minha Loja Conectada
4.2.7       Materiais Diversos                 ← Flanelas, acessórios (bucket "Outro")
4.2.8       Outras Despesas Recorrentes        ← Bucket residual
4.3       Despesas Financeiras
4.3.1       Taxa de Antecipação de Recebíveis  ← Custo da antecipação junto à operadora
4.4       Despesas Não Recorrentes (One-offs)
4.4.1       Itens Não Recorrentes              ← Lançamentos marcados como não-recorrente
```

### 3.5 Funcionalidade: Gestão do Plano de Contas

O sistema deve ter uma tela/seção dedicada onde o administrador pode:

1. **Visualizar** todo o plano de contas em árvore hierárquica
2. **Adicionar** nova conta (informando: código, nome, tipo — grupo/subgrupo/analítica, e conta-pai)
3. **Editar** nome e código de qualquer conta existente
4. **Excluir** conta — APENAS se não houver nenhum lançamento vinculado. Caso contrário, exibir aviso de bloqueio
5. **Reordenar** contas dentro do mesmo nível hierárquico

---

## 4. REGRAS DE NEGÓCIO — VENDAS

### 4.1 Venda de Peça — Estoque Próprio

Quando uma peça de estoque próprio é vendida, o sistema executa automaticamente:

| # | Lançamento | Débito | Crédito | Valor |
|---|-----------|--------|---------|-------|
| 1 | Receita bruta | Caixa / Contas a Receber | 3.1.1 Venda Estoque Próprio | Preço de venda |
| 2 | MDR (se cartão) | 3.2.1 MDR Taxa Cartão | Caixa | 4% do preço de venda |
| 3 | Simples Nacional | 3.2.2 Simples Nacional | 2.1.2.01 Simples a Recolher | Alíquota RBT12 × preço de venda |
| 4 | Baixa estoque (CMV) | 4.1.x Custo Aquisição | 1.1.3.01 Estoque | Custo total da peça (aquisição + manutenção/restauro) |

### 4.2 Regras de Meio de Pagamento

| Meio | MDR | Conta entrada | Gera Contas a Receber? |
|------|-----|---------------|----------------------|
| Pix (à vista) | 0% | 1.1.1.01 Nubank | Não — entrada imediata |
| Cartão crédito à vista | 4% | 1.1.1.02 PagBank | Sim — até liquidação (~D+30) |
| Cartão crédito parcelado (qualquer nº parcelas) | 4% | 1.1.1.02 PagBank | Sim — cada parcela = 1 recebível |

- **~70% das vendas** são à vista (quase sempre Pix)
- **~30% das vendas** são parceladas (até 12x com juros)
- Parcelamento: até 12x com juros (juros já embutidos no preço)

### 4.3 Venda de Peça — Consignação (~15% das peças vendidas)

Peças em consignação NÃO fazem parte do estoque da Mr. Chrono. O fluxo na venda:

| # | Lançamento | Débito | Crédito | Valor |
|---|-----------|--------|---------|-------|
| 1 | Receita (apenas margem) | Caixa / Contas a Receber | 3.1.2 Venda Consignação | Preço venda − valor repasse |
| 2 | Passivo de repasse | Caixa / Contas a Receber | 2.1.1.01 Repasse Consignação | Valor do repasse ao fornecedor |
| 3 | MDR (se cartão) | 3.2.1 MDR | Caixa | 4% sobre o preço total de venda |
| 4 | Simples Nacional | 3.2.2 Simples | 2.1.2.01 Simples a Recolher | Alíquota RBT12 × **apenas a margem** |

**Regras especiais de consignação:**
- Imposto (Simples Nacional) incide **apenas sobre a margem** (preço venda − repasse), conforme definido pelo Rafael
- O repasse ao fornecedor **não tem prazo definido**
- O fluxo de baixa é: venda gera passivo → quando Rafael efetivamente paga o fornecedor, ele **dá baixa manualmente** no passivo no sistema
- Modelo típico: dono da peça define quanto quer receber; tudo acima é receita da Mr. Chrono

### 4.4 Antecipação de Recebíveis

O sistema deve ter um botão/funcionalidade **"Registrar Antecipação"**:

1. Usuário seleciona os recebíveis a antecipar
2. Informa o **custo da antecipação** (taxa cobrada pela operadora)
3. Sistema **baixa o contas a receber**
4. Registra **entrada no caixa** pelo valor líquido (recebível − taxa)
5. A taxa é registrada como **4.3.1 Despesa Financeira — Antecipação**

---

## 5. REGRAS DE NEGÓCIO — IMPOSTOS

### 5.1 Simples Nacional

- **Anexo I — Comércio**
- Alíquota calculada **automaticamente** pelo sistema com base no **RBT12** (Receita Bruta acumulada dos últimos 12 meses)
- O sistema deve implementar a tabela completa do Simples Nacional Anexo I e calcular a alíquota efetiva mensal
- Na DRE atual, a alíquota variou entre 4% e 5,3% ao longo dos meses
- Imposto é registrado como dedução da receita bruta (conta 3.2.2)
- Gera passivo em 2.1.2.01 (Simples a Recolher)

### 5.2 MDR (Taxa do Gateway)

- Classificado como **dedução da receita bruta** (entre Receita Bruta e Receita Líquida)
- Pix: 0%
- Cartão crédito à vista: 4%
- Cartão crédito parcelado: 4%

---

## 6. REGRAS DE NEGÓCIO — ESTOQUE E CMV

### 6.1 Composição do Custo da Peça no Estoque

O custo total de uma peça = custo de aquisição + manutenção/restauro. Tudo vai para COGS na DRE.

| Componente | Tratamento |
|-----------|-----------|
| Custo de aquisição (leilão) | Já inclui o buyer's premium de 5% no valor inputado. A "Taxa de Leilão" como linha separada foi descontinuada |
| Custo de aquisição (eBay) | Convertido de USD para BRL pelo câmbio do **dia do pagamento**. Inclui a comissão do importador (10-20%) — tudo compõe o custo da peça diretamente no COGS |
| Custo de aquisição (pessoa física) | Valor negociado e pago à vista após autenticação |
| Manutenção/Revisão do relojoeiro | Entra no COGS (não é despesa operacional). R$122-R$357 por peça em média |
| Restauro de mostrador | Entra no COGS. R$300-R$600 por peça (depende da marca). Terceirizado em São Paulo, leva ~2 meses |

### 6.2 Regras Específicas

- **Câmbio (eBay/USD):** Converter para R$ no dia do pagamento. Sem controle de variação cambial posterior.
- **Consignação:** Peças consignadas ficam FORA do estoque até a venda. Não aparecem no ativo.
- **Fornecedor eBay:** Sempre registrado como "Mr. Chrono" no sistema (é o próprio Rafael que compra).
- **Frete de envio ao cliente:** É DESPESA operacional (conta 4.2.2), NÃO compõe o CMV.

---

## 7. REGRAS DE NEGÓCIO — DESPESAS

### 7.1 Despesas Recorrentes Programadas

O sistema deve ter uma funcionalidade onde o administrador cadastra despesas recorrentes:

| Campo | Descrição |
|-------|-----------|
| Nome da despesa | Ex: "Contabilidade" |
| Valor mensal (R$) | Ex: R$711,00 |
| Conta contábil | Ex: 4.2.4 Contabilidade |
| Data de reconhecimento | **Último dia do mês** (fixo para todas) |
| Status | Ativo / Inativo |

Despesas recorrentes atuais conhecidas:

| Despesa | Valor mensal | Conta |
|---------|-------------|-------|
| Contabilidade | R$711 | 4.2.4 |
| Dacto | R$531 | 4.2.5 |
| Minha Loja Conectada | R$180 | 4.2.6.03 |
| Manychat | R$249 | 4.2.6.01 |
| Poli Digital | R$449,90 | 4.2.6.02 |

### 7.2 Classificação Recorrente vs Não Recorrente

- Todo lançamento de despesa deve ser marcado como **"recorrente"** ou **"não-recorrente"**
- A DRE deve exibir um **Lucro Ajustado** (excluindo itens não-recorrentes) além do Lucro Líquido padrão
- A linha "One-offs" da DRE atual é mantida como grupo 4.4
- A linha "Outro" é mantida como bucket residual (4.2.7 / 4.2.8) para itens de baixo valor

### 7.3 Despesas Eliminadas

- **Comissões de venda:** Não existem mais. Foram eliminadas.

---

## 8. REGRAS DE NEGÓCIO — DISTRIBUIÇÃO DE LUCROS

- Retiradas dos sócios são registradas como **distribuição de lucros** (conta 2.3.3 — redutora do PL)
- NÃO há pró-labore — toda remuneração é via distribuição
- Geralmente **50/50** entre Rafael e João
- O sistema deve registrar quanto cada sócio retirou separadamente
- Na prática, é "sobrou, tirei" — sem planejamento formal
- Caixa mínimo informal: nunca ficar abaixo de R$10.000

---

## 9. DEMONSTRATIVOS FINANCEIROS

### 9.1 DRE — Demonstração do Resultado do Exercício

**Formato:** Todos os sub-níveis expandidos por padrão. Idioma: Português (BR-GAAP).

```
DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO
Período: [Mês/Ano]

RECEITA BRUTA DE VENDAS
  Venda de Peças — Estoque Próprio
  Venda de Peças — Consignação (margem)
(−) DEDUÇÕES DA RECEITA
  (−) MDR — Taxa de Cartão
  (−) Simples Nacional
= RECEITA LÍQUIDA

(−) CUSTO DAS MERCADORIAS VENDIDAS (CMV)
  Custo de Aquisição — Leilão
  Custo de Aquisição — eBay
  Custo de Aquisição — Pessoa Física
  Manutenção e Restauro
= LUCRO BRUTO
  Margem Bruta (%)

(−) DESPESAS OPERACIONAIS
  Marketing e Publicidade (Ads)
  Frete de Envio ao Cliente
  Editor de Vídeo
  Contabilidade
  Dacto
  Ferramentas e Sistemas
    Manychat
    Poli Digital
    Minha Loja Conectada
  Materiais Diversos
  Outras Despesas Recorrentes

(−) DESPESAS FINANCEIRAS
  Taxa de Antecipação de Recebíveis

= LUCRO OPERACIONAL (EBIT)

(−) DESPESAS NÃO RECORRENTES (ONE-OFFS)
  Itens Não Recorrentes

= LUCRO LÍQUIDO
  Margem Líquida (%)

= LUCRO AJUSTADO (excluindo não-recorrentes)
  Margem Ajustada (%)
```

### 9.2 Balanço Patrimonial

Gerado mensalmente, atualizado em tempo real.

```
BALANÇO PATRIMONIAL
Data: [DD/MM/AAAA]

ATIVO
  Ativo Circulante
    Caixa e Equivalentes (Nubank + PagBank)
    Contas a Receber — Clientes
    Estoques (Peças + Material de Embalagem)
  Ativo Não Circulante
    Imobilizado (se houver)
TOTAL DO ATIVO

PASSIVO
  Passivo Circulante
    Fornecedores — Repasse Consignação
    Simples Nacional a Recolher
    Outras Obrigações
  Passivo Não Circulante
    (vazio)
  Patrimônio Líquido
    Capital Social
    Lucros Acumulados
    (−) Distribuição de Lucros
TOTAL DO PASSIVO + PL
```

### 9.3 DFC — Demonstração do Fluxo de Caixa

**Método:** Indireto (parte do lucro líquido, ajusta por variações de balanço).

```
FLUXO DE CAIXA — MÉTODO INDIRETO
Período: [Mês/Ano]

ATIVIDADES OPERACIONAIS
  Lucro Líquido do Período
  Ajustes:
    (+/−) Variação de Contas a Receber
    (+/−) Variação de Estoques
    (+/−) Variação de Fornecedores (Consignação)
    (+/−) Variação de Obrigações Fiscais
= Caixa Gerado nas Operações

ATIVIDADES DE INVESTIMENTO
  (−) Aquisição de Imobilizado (se houver)
= Caixa Usado em Investimentos

ATIVIDADES DE FINANCIAMENTO
  (−) Distribuição de Lucros aos Sócios
= Caixa Usado em Financiamento

= VARIAÇÃO LÍQUIDA DE CAIXA
(+) Saldo Inicial de Caixa
= SALDO FINAL DE CAIXA
```

### 9.4 Periodicidade e Reporting

| Aspecto | Definição |
|---------|-----------|
| Fechamento formal | Mensal |
| Visão em tempo real | Sim — demonstrações atualizadas conforme lançamentos são inseridos |
| Comparativos | Mês anterior e acumulado no ano (YTD) |
| Budget vs Actual | Não implementado |
| Idioma | Português — padrão BR-GAAP |

---

## 10. FUNCIONALIDADES DO MÓDULO

### 10.1 Lista Completa de Funcionalidades

1. **Gestão do Plano de Contas** — CRUD completo (adicionar, editar, excluir, reordenar)
2. **Lançamentos manuais** — Input de custos, despesas, CAPEX, distribuição de lucros, transferências
3. **Despesas recorrentes programadas** — Cadastro de despesas fixas com lançamento automático no último dia do mês
4. **Classificação recorrente/não-recorrente** — Flag em cada lançamento
5. **Antecipação de recebíveis** — Funcionalidade dedicada com cálculo de taxa
6. **Transferências interbancárias** — Movimentação entre Nubank e PagBank sem impacto na DRE
7. **Distribuição de lucros** — Registro por sócio (Rafael / João)
8. **Baixa manual de passivos** — Especialmente repasse de consignação
9. **Geração automática de DRE** — Com todos os sub-níveis expandidos
10. **Geração automática de Balanço Patrimonial**
11. **Geração automática de DFC** — Método indireto
12. **Cálculo automático de Simples Nacional** — Baseado no RBT12
13. **Cálculo automático de MDR** — Baseado no meio de pagamento

### 10.2 Dados Que o Módulo Calcula Automaticamente (vs. Input Manual)

| Automático (herdado do sistema) | Input manual |
|-------------------------------|-------------|
| Receita bruta (vendas) | Despesas operacionais avulsas |
| CMV (custo da peça vendida) | Despesas recorrentes programadas |
| MDR (conforme meio de pagamento) | Distribuição de lucros |
| Simples Nacional (conforme RBT12) | Transferências interbancárias |
| Contas a Receber (parcelas) | Baixa de passivos (consignação) |
| Estoque (peças compradas) | Antecipação de recebíveis |
| Passivo de consignação (na venda) | One-offs / despesas não recorrentes |

---

## 11. DESIGN E UX

### 11.1 Diretrizes de Design

- **Estilo:** Clean, light mode, minimalista, moderno
- **Evitar:** "AI slop" — sem gradientes roxo-rosa, sem sombras genéricas
- **Referência:** Dashboards financeiros profissionais (estilo Stripe Dashboard, Linear)
- **Cores:** Neutras com acentos sutis. Priorizar legibilidade
- **Tipografia:** Limpa e profissional
- **Tabelas financeiras:** Alinhamento numérico à direita, formatação de moeda BR (R$ X.XXX,XX)
- **Números negativos:** Em vermelho ou entre parênteses
- **Percentuais:** Com 1 casa decimal

### 11.2 Navegação do Módulo

Sugestão de estrutura:

```
Módulo Financeiro
├── Dashboard (visão rápida: caixa, lucro do mês, pendências)
├── Lançamentos
│   ├── Novo Lançamento Manual
│   ├── Despesas Recorrentes (CRUD)
│   └── Histórico de Lançamentos
├── Demonstrativos
│   ├── DRE
│   ├── Balanço Patrimonial
│   └── Fluxo de Caixa
├── Plano de Contas (CRUD — árvore hierárquica)
├── Antecipação de Recebíveis
├── Transferências entre Contas
└── Distribuição de Lucros
```

---

## 12. STACK TÉCNICA RECOMENDADA

### 12.1 Stack do Projeto Mr. Chrono (já existente — manter consistência)

O módulo financeiro deve usar a mesma stack do sistema já existente. Caso o sistema use:

- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Backend:** tRPC ou API Routes
- **Database:** PostgreSQL com Prisma ORM
- **Auth:** Sistema já implementado (perfil Administrador)
- **UI Components:** shadcn/ui (ou biblioteca já em uso)

### 12.2 Plugins Recomendados para Claude Code

| Plugin | Finalidade |
|--------|-----------|
| **Language Server (vtsls)** | Navegação inteligente de código TypeScript |
| **Superpowers** | Workflows estruturados, TDD, debugging |
| **Frontend Design** | UIs profissionais e distintas (evitar AI slop) |
| **Context7 (MCP)** | Documentação atualizada de frameworks |

### 12.3 MCP Servers Recomendados

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

---

## 13. DOCUMENTOS A CRIAR ANTES DE CODAR

### 13.1 Documentação Obrigatória (pré-implementação)

| # | Documento | Propósito | Status |
|---|----------|----------|--------|
| 1 | **CLAUDE.md** | Contexto do projeto para Claude Code (stack, estrutura, padrões, regras) | A criar |
| 2 | **REGRAS_NEGOCIO.md** | Todas as regras de negócio do módulo financeiro (este documento é a base) | ✅ Este documento |
| 3 | **ARQUITETURA.md** | Decisões arquiteturais, schema do banco, relações entre entidades | A criar |
| 4 | **DATABASE.md** | Schema completo das tabelas do módulo financeiro (Prisma) | A criar |
| 5 | **API.md** | Endpoints/procedures tRPC do módulo financeiro | A criar |
| 6 | **ROADMAP.md** | Fases de implementação (o que construir primeiro, segundo, etc.) | A criar |

### 13.2 CLAUDE.md — Rascunho para o Projeto

Quando formos criar o CLAUDE.md, ele deve conter:
- Descrição do projeto (1-2 linhas)
- Stack técnica completa
- Comandos essenciais (dev, build, test, lint, db:push)
- Estrutura de pastas
- Padrões de código (TypeScript strict, componentes funcionais, etc.)
- Regras de negócio CRÍTICAS (apenas as top 5-10)
- Lista de "NÃO fazer"
- Workflow preferido
- Referência: `@docs/REGRAS_NEGOCIO.md` para regras detalhadas

### 13.3 DATABASE.md — Tabelas Principais (a detalhar)

Tabelas provável do módulo financeiro:

```
chart_of_accounts        → Plano de contas (hierárquico)
journal_entries          → Lançamentos contábeis (header)
journal_entry_lines      → Linhas de cada lançamento (débito/crédito)
recurring_expenses       → Despesas recorrentes programadas
bank_accounts            → Contas bancárias (Nubank, PagBank)
bank_transfers           → Transferências interbancárias
profit_distributions     → Distribuições de lucros por sócio
receivable_advances      → Antecipações de recebíveis
```

---

## 14. WORKFLOW DE IMPLEMENTAÇÃO SUGERIDO

### Fase 1 — Fundação
1. Criar schema do banco (tabelas do módulo financeiro)
2. Implementar CRUD do Plano de Contas (tela + API)
3. Implementar lançamentos manuais (tela + API)

### Fase 2 — Automações
4. Integrar com módulo de vendas (lançamentos automáticos na venda)
5. Implementar cálculo automático de Simples Nacional (RBT12)
6. Implementar cálculo automático de MDR
7. Implementar despesas recorrentes programadas

### Fase 3 — Demonstrativos
8. Gerar DRE automaticamente
9. Gerar Balanço Patrimonial automaticamente
10. Gerar DFC (método indireto) automaticamente

### Fase 4 — Funcionalidades Complementares
11. Antecipação de recebíveis
12. Transferências interbancárias
13. Distribuição de lucros por sócio
14. Baixa manual de passivos (consignação)

### Fase 5 — Polimento
15. Dashboard financeiro (visão rápida)
16. Testes e validação
17. Migração de dados históricos (DRE atual em Excel)

---

## 15. DECISÕES TOMADAS (LOG)

Registro cronológico de todas as decisões para rastreabilidade:

| # | Decisão | Justificativa |
|---|--------|--------------|
| 1 | Padrão contábil CPC/CFC brasileiro | Empresa brasileira, LTDA, Simples Nacional |
| 2 | KPIs operacionais fora do módulo financeiro | Separação de responsabilidades — dashboard próprio |
| 3 | Sem centros de custo | Operação pequena, visão consolidada suficiente |
| 4 | Alíquota Simples calculada automaticamente via RBT12 | Evitar erro humano, precisão fiscal |
| 5 | MDR como dedução da receita bruta | Padrão contábil correto |
| 6 | Pix 0%, Cartão 4% (à vista e parcelado) | Realidade das taxas atuais da Mr. Chrono |
| 7 | 2 contas bancárias PJ (Nubank + PagBank) | Realidade operacional |
| 8 | Câmbio pelo dia do pagamento, sem variação posterior | Simplicidade — empresa pequena |
| 9 | Consignação fora do estoque, receita apenas sobre margem | Definição do Rafael — confirmar com contador |
| 10 | Imposto sobre consignação incide apenas na margem | Definição do Rafael — **risco fiscal: confirmar com contador** |
| 11 | Repasse de consignação sem prazo — baixa manual | Operação informal, sem contrato de prazo |
| 12 | Sem dívidas/empréstimos no momento | Empresa não possui dívidas |
| 13 | Retiradas = distribuição de lucros (sem pró-labore) | Decisão societária dos sócios |
| 14 | One-offs mantidos com flag recorrente/não-recorrente | Exibir lucro ajustado na DRE |
| 15 | "Outro" mantido como bucket residual | Praticidade para itens de baixo valor |
| 16 | Comissões de venda eliminadas | Não existem mais |
| 17 | Sem depreciação/CAPEX automático | Não há ativos relevantes para depreciar |
| 18 | Investimentos em sistema/marca = despesa do período | Simplicidade contábil |
| 19 | Fluxo de caixa pelo método indireto | Mais prático, padrão de mercado |
| 20 | Compras sempre saem da conta PJ | Nunca da PF |
| 21 | Manutenção e restauro = COGS (não despesa operacional) | Compõe o custo da mercadoria vendida |
| 22 | Custo importação eBay = direto no COGS da peça | Inclui comissão do importador |
| 23 | Taxa de leilão já inclusa no custo inputado | Desconsiderar como linha separada |
| 24 | Frete de envio ao cliente = despesa operacional | NÃO compõe o CMV |
| 25 | Conta default para saídas = Nubank | Grande maioria das despesas sai de lá |
| 26 | Transferências PagBank→Nubank sem taxa | Apenas movimentação contábil |
| 27 | Distribuição 50/50 entre sócios (geralmente) | Registrar por sócio separadamente |
| 28 | Despesas recorrentes lançadas no último dia do mês | Padronização do reconhecimento |
| 29 | DRE com todos sub-níveis expandidos por padrão | Preferência do Rafael |
| 30 | Acesso apenas para perfil Administrador | Segurança e controle |
| 31 | Fechamento mensal com visão em tempo real | Gestão ágil |
| 32 | Idioma português, padrão BR-GAAP | Mercado brasileiro |

---

## 16. PONTOS DE ATENÇÃO E RISCOS

| # | Risco | Impacto | Mitigação |
|---|-------|---------|-----------|
| 1 | Tributação de consignação apenas sobre margem pode não estar correto no Simples Nacional Anexo I | Risco fiscal | **Confirmar com contador antes de implementar** |
| 2 | Importação de peças sem pagamento de imposto (importador traz na mala) | Risco fiscal/legal | Fora do escopo do sistema, mas relevante para compliance |
| 3 | Nem todas as vendas têm NF emitida (~60% apenas) | Risco fiscal | Fora do escopo do módulo, mas impacta a contabilidade |
| 4 | Dependência de 1 relojoeiro sem backup | Risco operacional (gargalo de estoque) | Não é escopo do módulo financeiro |
| 5 | Migração de dados históricos (DRE em Excel desde nov/24) | Pode ter inconsistências | Planejar migration cuidadosa na Fase 5 |

---

*Documento gerado em Fevereiro 2026. Atualizar conforme novas decisões forem tomadas durante o desenvolvimento.*
