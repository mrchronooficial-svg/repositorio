# FASE 6: Módulo Vendas + Clientes

> Implementar registro de vendas com pagamentos parciais, repasse de consignação e módulo de clientes.

---

## Informações Gerais

| Item | Valor |
|------|-------|
| **Objetivo** | CRUD de vendas e clientes com lógica de negócio |
| **Pré-requisitos** | Fase 5 concluída (estoque) |
| **Complexidade** | Alta |
| **Dependência** | Fase 5 |

---

## Checklist de Tarefas

### Backend
- [ ] Criar router `packages/api/src/routers/cliente.ts`
- [ ] Criar router `packages/api/src/routers/venda.ts`
- [ ] Criar service `packages/api/src/services/alerta.service.ts`
- [ ] Atualizar root router

### Frontend - Vendas
- [ ] Criar página de listagem `/vendas`
- [ ] Criar página nova venda `/vendas/nova`
- [ ] Criar página detalhes `/vendas/[id]`
- [ ] Criar formulário de venda
- [ ] Criar dialog de pagamento
- [ ] Criar dialog de repasse
- [ ] Criar dialog de devolução

### Frontend - Clientes
- [ ] Criar página de listagem `/clientes`
- [ ] Criar página detalhes `/clientes/[id]`
- [ ] Criar formulário de cliente
- [ ] Criar dashboard de clientes

---

## Regras de Negócio Críticas

### Vendas

1. **1 VENDA = 1 PEÇA** (sempre)
2. Peça deve estar com status **DISPONÍVEL**
3. Pagamentos parciais permitidos
4. Taxa MDR do cartão: 4% (configurável)
5. Se consignação: gerar alerta de repasse pendente
6. Devolução (7 dias): peça volta ao estoque com SKU derivado

### Fluxo de Criação de Venda

```
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
```

### Status de Pagamento

| Status | Condição |
|--------|----------|
| PAGO | 100% do valor recebido |
| PARCIAL | Parte do valor recebido |
| NAO_PAGO | Nenhum valor recebido |

### Status de Repasse (Consignação)

| Status | Condição |
|--------|----------|
| FEITO | 100% do repasse realizado |
| PARCIAL | Parte do repasse realizado |
| PENDENTE | Nenhum repasse feito |

---

## Arquivos a Criar

### Backend

#### 1. Service de Alerta

**Arquivo:** `packages/api/src/services/alerta.service.ts`

```typescript
import { prisma } from "@gestaomrchrono/db";
import { TipoAlerta } from "@prisma/client";

interface CriarAlertaParams {
  tipo: TipoAlerta;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
}

export async function criarAlerta(params: CriarAlertaParams): Promise<void> {
  await prisma.alerta.create({
    data: params,
  });
}

export async function criarAlertaRepassePendente(
  vendaId: string,
  fornecedorNome: string,
  valor: number
): Promise<void> {
  await criarAlerta({
    tipo: "REPASSE_PENDENTE",
    titulo: "Repasse Pendente",
    mensagem: `Venda registrada. Repasse de R$ ${valor.toFixed(2)} pendente para ${fornecedorNome}.`,
    entidade: "VENDA",
    entidadeId: vendaId,
  });
}
```

---

#### 2. Router tRPC Cliente

**Arquivo:** `packages/api/src/routers/cliente.ts`

**Procedures:**

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `list` | Query | Lista com métricas |
| `getById` | Query | Busca completa com métricas |
| `getByCpfCnpj` | Query | Busca por CPF/CNPJ |
| `create` | Mutation | Cadastra cliente |
| `update` | Mutation | Atualiza dados |
| `archive` | Mutation | Arquiva (soft delete) |
| `getHistoricoCompras` | Query | Lista vendas do cliente |
| `getDashboard` | Query | Métricas para dashboard |
| `getTopClientes` | Query | Rankings Top 10 |

**Métricas Calculadas:**

| Métrica | Fórmula |
|---------|---------|
| Faturamento Total | Σ valor final de todas as vendas |
| Número de Peças | Count de vendas concluídas |
| Tempo como Cliente | Data atual - Data da 1ª compra |
| Recorrência | Número de compras ÷ Tempo como cliente (em meses) |
| LTV | Σ (Valor Venda - Valor Compra) de cada peça |

---

#### 3. Router tRPC Venda

**Arquivo:** `packages/api/src/routers/venda.ts`

**Procedures:**

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `list` | Query | Lista vendas com filtros |
| `getById` | Query | Detalhes completos |
| `create` | Mutation | Registra venda (complexo) |
| `update` | Mutation | Atualiza venda |
| `cancel` | Mutation | Cancela/devolução |
| `registrarPagamento` | Mutation | Adiciona pagamento |
| `registrarRepasse` | Mutation | Registra repasse |
| `getRecebiveis` | Query | Total a receber |

---

### Frontend - Vendas

#### Páginas

| Arquivo | Descrição |
|---------|-----------|
| `apps/web/src/app/(dashboard)/vendas/page.tsx` | Listagem com filtros |
| `apps/web/src/app/(dashboard)/vendas/nova/page.tsx` | Fluxo de venda |
| `apps/web/src/app/(dashboard)/vendas/[id]/page.tsx` | Detalhes e ações |

#### Componentes

| Arquivo | Descrição |
|---------|-----------|
| `components/tables/vendas-table.tsx` | Tabela com status |
| `components/forms/venda-form.tsx` | Fluxo completo de venda |
| `components/cards/venda-card.tsx` | Card de detalhes |
| `components/dialogs/pagamento-dialog.tsx` | Registrar pagamento |
| `components/dialogs/repasse-dialog.tsx` | Registrar repasse |
| `components/dialogs/devolucao-dialog.tsx` | Confirmar devolução |

---

### Frontend - Clientes

#### Páginas

| Arquivo | Descrição |
|---------|-----------|
| `apps/web/src/app/(dashboard)/clientes/page.tsx` | Dashboard + listagem |
| `apps/web/src/app/(dashboard)/clientes/novo/page.tsx` | Cadastro manual |
| `apps/web/src/app/(dashboard)/clientes/[id]/page.tsx` | Card com histórico |

#### Componentes

| Arquivo | Descrição |
|---------|-----------|
| `components/tables/clientes-table.tsx` | Tabela com métricas |
| `components/forms/cliente-form.tsx` | Formulário completo |
| `components/cards/cliente-card.tsx` | Card de detalhes |
| `components/clientes-dashboard.tsx` | Rankings e métricas |

---

## Fluxo de Devolução

```
1. Marcar venda como cancelada
2. Registrar data do cancelamento
3. Criar NOVA peça com SKU derivado (MRC-XXXX-N)
4. Nova peça herda dados da original
5. Nova peça entra com status DISPONÍVEL
6. Incrementar contador de devoluções na peça original
```

---

## Critérios de Conclusão

| Critério | Status |
|----------|--------|
| Registrar venda com peça existente | [ ] |
| Buscar peça por SKU | [ ] |
| Criar cliente inline durante venda | [ ] |
| Pagamentos parciais funcionando | [ ] |
| Status de pagamento atualiza automaticamente | [ ] |
| Consignação gera alerta de repasse | [ ] |
| Registrar repasse atualiza status | [ ] |
| Devolução cria peça com SKU derivado | [ ] |
| Dashboard de clientes com rankings | [ ] |
| Funcionário NÃO vê valores | [ ] |

---

## Próxima Fase

Após concluir esta fase, seguir para **FASE 7: Dashboard Principal + Sistema de Alertas**.

---

*Atualizar este documento conforme progresso*
