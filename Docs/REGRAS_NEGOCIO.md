# Regras de Negócio - Sistema Mr. Chrono

> Documento detalhado com todas as regras de negócio, fluxos e edge cases do sistema.

---

## 1. Entidades Principais

### 1.1 Peça (Relógio)

A peça é o ativo central do negócio. Representa um relógio vintage que passa por todo o ciclo: aquisição → estoque → venda.

#### Ciclo de Vida da Peça

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  FORNECEDOR │───▶│  EM TRÂNSITO│───▶│  DISPONÍVEL │───▶│   VENDIDA   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │
                          ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐
                   │   REVISÃO   │    │   DEFEITO   │
                   │ (Relojoeiro)│    │   PERDA     │
                   └─────────────┘    └─────────────┘
```

#### Regras do SKU

| Situação | Formato | Exemplo |
|----------|---------|---------|
| Peça nova | MRC-XXXX | MRC-0001 |
| 1ª devolução | MRC-XXXX-1 | MRC-0001-1 |
| 2ª devolução | MRC-XXXX-2 | MRC-0001-2 |
| N-ésima devolução | MRC-XXXX-N | MRC-0001-N |

**Regras:**
- SKU é gerado automaticamente pelo sistema
- Sequencial na ordem de criação
- Nunca reutilizado, mesmo se peça for excluída
- SKU derivado mantém rastreabilidade da peça original

#### Status da Peça

| Status | Descrição | Contabiliza Estoque | Pode Vender |
|--------|-----------|---------------------|-------------|
| DISPONIVEL | Pronta para venda | ✅ Sim | ✅ Sim |
| EM_TRANSITO | Em deslocamento | ✅ Sim | ❌ Não |
| REVISAO | No relojoeiro | ✅ Sim | ❌ Não |
| VENDIDA | Transação concluída | ❌ Não | ❌ Não |
| DEFEITO | Devolvida ao fornecedor | ❌ Não | ❌ Não |
| PERDA | Perdida/roubada/danificada | ❌ Não | ❌ Não |

#### Transições de Status Permitidas

```
DISPONIVEL ──▶ EM_TRANSITO ──▶ DISPONIVEL
DISPONIVEL ──▶ REVISAO ──▶ DISPONIVEL
DISPONIVEL ──▶ VENDIDA
DISPONIVEL ──▶ DEFEITO
DISPONIVEL ──▶ PERDA

EM_TRANSITO ──▶ DISPONIVEL
EM_TRANSITO ──▶ REVISAO
EM_TRANSITO ──▶ DEFEITO
EM_TRANSITO ──▶ PERDA

REVISAO ──▶ DISPONIVEL
REVISAO ──▶ EM_TRANSITO
REVISAO ──▶ DEFEITO

VENDIDA ──▶ DISPONIVEL (somente via devolução, gera SKU derivado)
```

**Transições NÃO permitidas:**
- DEFEITO não volta para nenhum status
- PERDA não volta para nenhum status
- VENDIDA só volta via processo formal de devolução

---

### 1.2 Fornecedor

Pessoa física ou jurídica que fornece peças para a Mr. Chrono.

#### Tipos de Fornecimento

| Tipo | Descrição | Dados Extras |
|------|-----------|--------------|
| COMPRA | Peça adquirida definitivamente | Valor de compra |
| CONSIGNACAO | Peça de terceiro para venda | Valor de repasse acordado |

#### Canais de Origem (quando COMPRA)

| Canal | Descrição |
|-------|-----------|
| PESSOA_FISICA | Compra direta de pessoa física |
| LEILAO_BRASIL | Compra em leilões nacionais |
| EBAY | Importação via eBay ou similar |

#### Score do Fornecedor

| Score | Significado |
|-------|-------------|
| EXCELENTE | Peças sempre em ótimo estado, entrega rápida |
| BOM | Peças em bom estado, poucos problemas |
| REGULAR | Alguns problemas, mas aceitável |
| RUIM | Muitos problemas, evitar negócios futuros |

**Regra:** Score é preenchido manualmente pelo usuário, baseado em experiência histórica.

---

### 1.3 Cliente

Pessoa física ou jurídica que compra relógios da Mr. Chrono.

#### Métricas Calculadas

| Métrica | Fórmula |
|---------|---------|
| Faturamento Total | Σ valor final de todas as vendas |
| Número de Peças | Count de vendas concluídas |
| Tempo como Cliente | Data atual - Data da 1ª compra |
| Recorrência | Número de compras ÷ Tempo como cliente (em meses) |
| LTV (Lifetime Value) | Σ (Valor Venda - Valor Compra) de cada peça |

#### Cálculo do LTV Detalhado

```
Para cada venda do cliente:
  Margem = Valor Final da Venda - Valor de Compra da Peça

LTV = Σ Margem de todas as vendas

Exemplo:
  Venda 1: Vendeu por R$ 15.000, comprou por R$ 10.000 → Margem = R$ 5.000
  Venda 2: Vendeu por R$ 8.000, comprou por R$ 6.000 → Margem = R$ 2.000
  LTV = R$ 7.000
```

---

### 1.4 Venda

Registro de uma transação de venda de uma peça para um cliente.

#### Regra Fundamental

> **1 VENDA = 1 PEÇA** (sempre)

Se cliente comprar 2 peças = 2 registros de venda separados.

#### Fluxo de Venda

```
1. Buscar peça pelo SKU (deve estar DISPONÍVEL)
2. Selecionar ou cadastrar cliente
3. Informar valor final de venda
4. Se houver desconto, registrar valor original e desconto
5. Informar forma de pagamento
6. Se consignação, sistema calcula repasse pendente
7. Sistema atualiza peça para VENDIDA
8. Sistema atualiza localização para CLIENTE_FINAL
9. Se pagamento parcial, registrar valor da entrada
```

#### Formas de Pagamento

| Forma | Parcelas | Taxa MDR |
|-------|----------|----------|
| PIX | 1x | 0% |
| CREDITO_VISTA | 1x | 4% |
| CREDITO_PARCELADO | 2x a 12x | 4% |

**Regras:**
- Taxa MDR é configurável no Painel Admin (padrão: 4%)
- No parcelado, taxa é repassada ao cliente
- Não existe "Pix parcelado" ou parcelamento próprio

#### Pagamentos Parciais

Muitas vendas são feitas com entrada + pagamentos posteriores.

| Status Pagamento | Condição |
|------------------|----------|
| PAGO | 100% do valor recebido |
| PARCIAL | Parte do valor recebido |
| NAO_PAGO | Nenhum valor recebido |

**Regras:**
- Cada pagamento é registrado com valor e data
- Não existe prazo máximo para pagamento do restante
- Não há alerta automático para pagamentos pendentes
- Vendas com status NAO_PAGO devem ser exibidas em vermelho

#### Consignação - Repasse

Quando peça é de consignação, ao vender:

| Status Repasse | Condição |
|----------------|----------|
| FEITO | 100% do repasse realizado |
| PARCIAL | Parte do repasse realizado |
| PENDENTE | Nenhum repasse feito |

**Regras:**
- Sistema gera ALERTA automático de repasse pendente
- Alerta aparece na aba Fornecedores
- Repasse pode ser marcado como feito/parcial posteriormente

#### Devolução / Cancelamento

Se venda for cancelada ou cliente devolver (7 dias):

1. Marcar venda como cancelada
2. Registrar data do cancelamento
3. Criar NOVA peça com SKU derivado (MRC-XXXX-N)
4. Nova peça herda dados da original
5. Nova peça entra com status DISPONÍVEL
6. Incrementar contador de devoluções na peça original

---

## 2. Fluxos Críticos

### 2.1 Cadastro de Peça com Fornecedor Novo

```
1. Usuário inicia cadastro de peça
2. Preenche dados da peça (marca, modelo, fotos, etc.)
3. No campo fornecedor, digita CPF/CNPJ
4. Sistema busca no banco:
   
   SE encontrar:
     → Exibe dados do fornecedor existente
     → Usuário confirma seleção
   
   SE NÃO encontrar:
     → Abre formulário de fornecedor inline
     → Usuário preenche dados completos
     → Ao salvar peça, sistema cria fornecedor automaticamente
```

### 2.2 Registro de Venda com Cliente Novo

```
1. Usuário busca peça pelo SKU
2. Sistema valida que peça está DISPONÍVEL
3. No campo cliente, digita CPF/CNPJ
4. Sistema busca no banco:
   
   SE encontrar:
     → Exibe dados do cliente existente
     → Usuário confirma seleção
   
   SE NÃO encontrar:
     → Abre formulário de cliente inline
     → Usuário preenche dados completos
     → Ao salvar venda, sistema cria cliente automaticamente
```

### 2.3 Alerta de Estoque Baixo

```
1. Sistema calcula estoque ideal:
   Estoque Ideal = Meta Semanal × (Lead Time ÷ 7)

2. Sistema conta peças DISPONÍVEIS

3. SE peças disponíveis < estoque ideal:
   → Gera alerta: "Estoque atual: X peças. Ideal: Y peças."
   → Alerta aparece no header e dashboard
```

### 2.4 Alerta de Peça no Relojoeiro

```
1. Sistema monitora peças com status REVISAO
2. Calcula dias desde mudança para REVISAO
3. SE dias > parâmetro configurado (padrão: 14):
   → Gera alerta: "Peça MRC-XXXX está no relojoeiro há X dias"
```

---

## 3. Permissões por Nível de Acesso

### 3.1 Matriz Completa de Permissões

| Funcionalidade | ADMINISTRADOR | SOCIO | FUNCIONARIO |
|----------------|---------------|-------|-------------|
| **Dashboard** |
| Ver valores em R$ | ✅ | ✅ | ❌ |
| Ver quantidades | ✅ | ✅ | ✅ |
| **Peças** |
| Listar | ✅ | ✅ | ✅ |
| Cadastrar | ✅ | ✅ | ✅ |
| Editar | ✅ | ✅ | ✅ |
| Editar peça vendida | ✅ | ✅ | ❌ |
| Excluir/Arquivar | ✅ | ✅ | ❌ |
| Ver valor de compra | ✅ | ✅ | ❌ |
| Ver valor estimado venda | ✅ | ✅ | ❌ |
| **Fornecedores** |
| Listar | ✅ | ✅ | ✅ |
| Cadastrar | ✅ | ✅ | ✅ |
| Editar | ✅ | ✅ | ✅ |
| Excluir/Arquivar | ✅ | ✅ | ❌ |
| Ver volume transacionado | ✅ | ✅ | ❌ |
| **Clientes** |
| Listar | ✅ | ✅ | ✅ |
| Cadastrar | ✅ | ✅ | ✅ |
| Editar | ✅ | ✅ | ✅ |
| Excluir/Arquivar | ✅ | ✅ | ❌ |
| Ver faturamento/LTV | ✅ | ✅ | ❌ |
| **Vendas** |
| Listar | ✅ | ✅ | ✅ |
| Registrar | ✅ | ✅ | ✅ |
| Editar | ✅ | ✅ | ❌ |
| Cancelar | ✅ | ✅ | ❌ |
| Ver valores | ✅ | ✅ | ❌ |
| **Painel Admin** |
| Acessar | ✅ | ❌ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ |
| Configurar parâmetros | ✅ | ❌ | ❌ |
| Ver auditoria | ✅ | ❌ | ❌ |

### 3.2 Regra de Ocultação de Valores

Para usuário FUNCIONARIO, ocultar:
- Valor de compra da peça
- Valor estimado de venda
- Valor final da venda
- Faturamento de clientes
- LTV de clientes
- Volume transacionado de fornecedores
- Recebíveis pendentes
- Qualquer métrica em R$ no dashboard

Mostrar apenas quantidades (número de peças, número de vendas, etc.)

---

## 4. Validações de Dados

### 4.1 CPF

```javascript
// 11 dígitos numéricos
// Validar dígitos verificadores
// Não permitir sequências repetidas (111.111.111-11)
// Formato de exibição: XXX.XXX.XXX-XX
```

### 4.2 CNPJ

```javascript
// 14 dígitos numéricos
// Validar dígitos verificadores
// Não permitir sequências repetidas
// Formato de exibição: XX.XXX.XXX/XXXX-XX
```

### 4.3 Telefone

```javascript
// Aceitar: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
// Armazenar apenas dígitos
// Mínimo 10 dígitos, máximo 11
```

### 4.4 CEP

```javascript
// 8 dígitos numéricos
// Integrar com ViaCEP para autopreenchimento
// Formato de exibição: XXXXX-XXX
```

### 4.5 Valores Monetários

```javascript
// Sempre positivos
// Máximo 2 casas decimais
// Armazenar como Decimal(10,2) no banco
// Exibir com R$ e separadores brasileiros: R$ 1.234,56
```

---

## 5. Edge Cases

### 5.1 Peça

| Situação | Tratamento |
|----------|------------|
| Foto não carrega no upload | Exibir erro, não permitir salvar sem foto |
| Fornecedor é excluído após cadastro da peça | Soft delete do fornecedor, peça mantém referência |
| Mesma peça vendida duas vezes (bug) | Constraint UNIQUE no banco impede |
| SKU já existe | Impossível - gerado automaticamente |

### 5.2 Venda

| Situação | Tratamento |
|----------|------------|
| Peça não está DISPONÍVEL | Bloquear venda, exibir status atual |
| Cliente com CPF inválido | Bloquear, exibir erro de validação |
| Valor de venda = 0 | Bloquear, valor mínimo R$ 0,01 |
| Pagamento > valor da venda | Bloquear, exibir erro |
| Devolução após 7 dias | Perguntar se deseja prosseguir (regra de negócio, não técnica) |

### 5.3 Consignação

| Situação | Tratamento |
|----------|------------|
| Repasse > valor de venda | Alertar usuário, mas permitir (casos legítimos) |
| Venda cancelada com repasse já feito | Registrar no histórico, marcar situação especial |
| Fornecedor com múltiplas peças consignadas vendidas | Agrupar alertas por fornecedor |

---

## 6. Auditoria

### 6.1 Ações Registradas

| Entidade | Ações Auditadas |
|----------|-----------------|
| Peça | Criar, Editar, Mudar Status, Mudar Localização, Arquivar, Excluir |
| Fornecedor | Criar, Editar, Arquivar, Excluir |
| Cliente | Criar, Editar, Arquivar, Excluir |
| Venda | Registrar, Editar, Cancelar, Registrar Pagamento |
| Usuário | Criar, Editar, Bloquear, Desbloquear, Alterar Nível |
| Configuração | Alterar qualquer parâmetro |

### 6.2 Dados do Registro de Auditoria

```typescript
{
  id: string
  userId: string          // Quem fez
  acao: string            // O que fez (CRIAR, EDITAR, etc.)
  entidade: string        // Onde fez (PECA, VENDA, etc.)
  entidadeId: string      // ID do registro afetado
  detalhes: string        // JSON com antes/depois ou descrição
  createdAt: DateTime     // Quando fez
}
```

---

## 7. Integrações Externas

### 7.1 ViaCEP (Consulta de CEP)

```
URL: https://viacep.com.br/ws/{cep}/json/
Método: GET
Retorno: { cep, logradouro, bairro, localidade, uf }
Usar para: Autopreenchimento de endereço em formulários
```

### 7.2 Futuras Integrações (Roadmap)

| Integração | Módulo | Prioridade |
|------------|--------|------------|
| WhatsApp Business API | Comunidade | Baixa |
| Instagram Graph API | Marketing | Baixa |
| Email transacional (Resend) | Notificações | Média |
| Upload de imagens (Cloudinary/S3) | Estoque | Alta |

---

## 8. Glossário

| Termo | Definição |
|-------|-----------|
| SKU | Stock Keeping Unit - identificador único da peça |
| LTV | Lifetime Value - valor total de margem gerada pelo cliente |
| MDR | Merchant Discount Rate - taxa da maquininha de cartão |
| Lead Time | Tempo médio entre compra e disponibilidade da peça |
| Consignação | Modelo onde a peça pertence a terceiro e Mr. Chrono recebe comissão |
| Repasse | Valor pago ao fornecedor quando peça consignada é vendida |
| Soft Delete | Exclusão lógica (arquivar) ao invés de remover do banco |

---

*Documento criado em: Janeiro/2026*
*Versão: 1.0*
*Manter atualizado conforme regras evoluem*
