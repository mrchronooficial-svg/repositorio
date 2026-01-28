# FASE 7: Dashboard Principal + Sistema de Alertas

> Implementar dashboard principal com métricas e sistema de alertas.

---

## Informações Gerais

| Item | Valor |
|------|-------|
| **Objetivo** | Dashboard com métricas e notificações |
| **Pré-requisitos** | Fase 6 concluída (vendas/clientes) |
| **Complexidade** | Média |
| **Dependência** | Fase 6 |

---

## Checklist de Tarefas

### Backend
- [ ] Criar router `packages/api/src/routers/dashboard.ts`
- [ ] Criar router `packages/api/src/routers/alerta.ts`
- [ ] Criar service `packages/api/src/services/estoque.service.ts`
- [ ] Atualizar root router

### Frontend
- [ ] Modificar página dashboard `/dashboard`
- [ ] Criar cards de métricas
- [ ] Criar alerta de estoque
- [ ] Criar gráfico de vendas
- [ ] Criar lista de alertas
- [ ] Criar atividades recentes
- [ ] Atualizar componente de notificações no header

---

## Cálculo de Estoque Ideal

```
Estoque Ideal = Meta Semanal × (Lead Time ÷ 7)

Exemplo:
- Meta: 10 peças/semana
- Lead Time: 20 dias
- Estoque Ideal = 10 × (20 ÷ 7) = ~29 peças disponíveis
```

---

## Arquivos a Criar

### Backend

#### 1. Service de Estoque

**Arquivo:** `packages/api/src/services/estoque.service.ts`

```typescript
import { prisma } from "@gestaomrchrono/db";

export async function calcularEstoqueIdeal(): Promise<number> {
  const configs = await prisma.configuracao.findMany({
    where: {
      chave: { in: ["meta_vendas_semana", "lead_time_dias"] },
    },
  });

  const meta = parseInt(
    configs.find((c) => c.chave === "meta_vendas_semana")?.valor || "10"
  );
  const leadTime = parseInt(
    configs.find((c) => c.chave === "lead_time_dias")?.valor || "20"
  );

  return Math.ceil(meta * (leadTime / 7));
}

export async function contarPecasDisponiveis(): Promise<number> {
  return prisma.peca.count({
    where: {
      status: { in: ["DISPONIVEL", "EM_TRANSITO", "REVISAO"] },
      arquivado: false,
    },
  });
}

export async function verificarAlertaEstoque(): Promise<void> {
  const [ideal, atual] = await Promise.all([
    calcularEstoqueIdeal(),
    contarPecasDisponiveis(),
  ]);

  if (atual < ideal) {
    // Verificar se já existe alerta não lido
    const alertaExistente = await prisma.alerta.findFirst({
      where: {
        tipo: "ESTOQUE_BAIXO",
        lido: false,
      },
    });

    if (!alertaExistente) {
      await prisma.alerta.create({
        data: {
          tipo: "ESTOQUE_BAIXO",
          titulo: "Estoque Abaixo do Ideal",
          mensagem: `Estoque atual: ${atual} peças. Ideal: ${ideal} peças.`,
        },
      });
    }
  }
}
```

---

#### 2. Router tRPC Dashboard

**Arquivo:** `packages/api/src/routers/dashboard.ts`

**Procedures:**

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `getResumo` | Query | Métricas principais |
| `getEstoqueStatus` | Query | Peças por status |
| `getEstoqueIdeal` | Query | Cálculo estoque ideal |
| `getVendasPeriodo` | Query | Vendas no período |
| `getEvolucaoVendas` | Query | Dados para gráfico |

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

---

#### 3. Router tRPC Alerta

**Arquivo:** `packages/api/src/routers/alerta.ts`

**Procedures:**

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `list` | Query | Lista alertas não lidos |
| `getCount` | Query | Conta alertas não lidos |
| `marcarLido` | Mutation | Marca um como lido |
| `marcarTodosLidos` | Mutation | Marca todos como lidos |

---

### Frontend

#### 4. Página Dashboard

**Arquivo:** `apps/web/src/app/(dashboard)/page.tsx`

Layout:
1. Cards de métricas principais (4 cards)
2. Alerta de estoque (se aplicável)
3. Gráfico de vendas (últimos 30 dias)
4. Lista de alertas pendentes
5. Atividades recentes

---

#### 5. Componentes

| Arquivo | Descrição |
|---------|-----------|
| `components/dashboard/metric-cards.tsx` | 4 cards de métricas |
| `components/dashboard/estoque-alert.tsx` | Banner de alerta |
| `components/charts/vendas-chart.tsx` | Gráfico de linha |
| `components/dashboard/alertas-list.tsx` | Lista compacta |
| `components/dashboard/atividades-recentes.tsx` | Últimas 5 ações |

---

## Tipos de Alerta

| Tipo | Gatilho | Mensagem |
|------|---------|----------|
| `ESTOQUE_BAIXO` | estoque < estoque ideal | "Estoque atual: X peças. Ideal: Y peças." |
| `RELOJOEIRO_DEMORADO` | peça em REVISAO > X dias | "Peça MRC-XXXX está no relojoeiro há X dias" |
| `REPASSE_PENDENTE` | venda de consignação | "Repasse pendente para [fornecedor]" |

---

## Cards de Métricas

| Card | Ícone | Dados |
|------|-------|-------|
| Peças Disponíveis | Package | Quantidade de peças disponíveis |
| Vendas do Mês | ShoppingCart | Quantidade de vendas no mês |
| Recebíveis | Wallet | Valor a receber (Admin/Sócio) |
| Estoque Ideal | TrendingUp | Comparativo ideal vs atual |

---

## Critérios de Conclusão

| Critério | Status |
|----------|--------|
| Dashboard exibe métricas corretas | [ ] |
| Cálculo de estoque ideal funciona | [ ] |
| Alerta de estoque baixo aparece | [ ] |
| Gráfico de vendas renderiza | [ ] |
| Notificações no header com contador | [ ] |
| Marcar alertas como lidos funciona | [ ] |
| Funcionário vê quantidades (sem R$) | [ ] |

---

## Próxima Fase

Após concluir esta fase, seguir para **FASE 8: Painel Administrativo**.

---

*Atualizar este documento conforme progresso*
