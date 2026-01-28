# FASE 8: Painel Administrativo

> Implementar painel admin com gestão de usuários, configurações e auditoria.

---

## Informações Gerais

| Item | Valor |
|------|-------|
| **Objetivo** | Painel de administração completo |
| **Pré-requisitos** | Fase 3 concluída (pode ser paralelo) |
| **Complexidade** | Média |
| **Dependência** | Fase 3 (pode iniciar após layout) |

---

## Checklist de Tarefas

### Backend
- [ ] Criar router `packages/api/src/routers/admin.ts`
- [ ] Atualizar root router

### Frontend
- [ ] Criar layout admin `/admin/layout.tsx`
- [ ] Criar página principal `/admin`
- [ ] Criar página de usuários `/admin/usuarios`
- [ ] Criar página de configurações `/admin/configuracoes`
- [ ] Criar página de auditoria `/admin/auditoria`
- [ ] Criar tabela de usuários
- [ ] Criar formulário de usuário
- [ ] Criar dialog de reset de senha
- [ ] Criar formulário de configurações
- [ ] Criar tabela de auditoria

---

## Arquivos a Criar

### Backend

#### 1. Router tRPC Admin

**Arquivo:** `packages/api/src/routers/admin.ts`

Todas as procedures usam `adminProcedure` (apenas administradores).

**Procedures:**

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `listUsers` | Query | Lista usuários |
| `createUser` | Mutation | Cria usuário |
| `updateUser` | Mutation | Atualiza usuário |
| `deleteUser` | Mutation | Exclui usuário |
| `toggleUserStatus` | Mutation | Bloqueia/desbloqueia |
| `resetPassword` | Mutation | Reseta senha |
| `getConfiguracoes` | Query | Lista configs |
| `updateConfiguracao` | Mutation | Atualiza config |
| `getAuditoria` | Query | Lista logs com paginação |

---

### Frontend

#### 2. Layout Admin

**Arquivo:** `apps/web/src/app/(dashboard)/admin/layout.tsx`

```typescript
import { redirect } from "next/navigation";
import { auth } from "@gestaomrchrono/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.nivel !== "ADMINISTRADOR") {
    redirect("/dashboard");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Painel Administrativo</h1>
      {children}
    </div>
  );
}
```

---

#### 3. Páginas

| Arquivo | Descrição |
|---------|-----------|
| `apps/web/src/app/(dashboard)/admin/page.tsx` | Cards com links |
| `apps/web/src/app/(dashboard)/admin/usuarios/page.tsx` | Gestão de usuários |
| `apps/web/src/app/(dashboard)/admin/configuracoes/page.tsx` | Parâmetros do sistema |
| `apps/web/src/app/(dashboard)/admin/auditoria/page.tsx` | Logs de ações |

---

#### 4. Componentes

| Arquivo | Descrição |
|---------|-----------|
| `components/admin/usuarios-table.tsx` | Tabela de usuários |
| `components/admin/usuario-form.tsx` | Formulário de usuário |
| `components/admin/reset-senha-dialog.tsx` | Dialog de reset |
| `components/admin/configuracoes-form.tsx` | Form de configs |
| `components/admin/auditoria-table.tsx` | Tabela de logs |

---

## Configurações Disponíveis

| Chave | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `taxa_mdr` | number | 4 | Taxa MDR do cartão (%) |
| `lead_time_dias` | number | 20 | Lead time para estoque ideal |
| `meta_vendas_semana` | number | 10 | Meta de vendas semanal |
| `alerta_relojoeiro_dias` | number | 14 | Dias para alerta de revisão |
| `localizacoes` | string | [...] | Lista de localizações (separadas por vírgula) |

---

## Gestão de Usuários

### Campos do Usuário

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | string | Sim |
| Email | string (email) | Sim |
| Senha | string (min 8) | Apenas criação |
| Nível | enum | Sim |
| Ativo | boolean | Não (default: true) |

### Níveis de Acesso

| Nível | Descrição |
|-------|-----------|
| ADMINISTRADOR | Acesso total + Painel Admin |
| SOCIO | Acesso total aos dados (sem admin) |
| FUNCIONARIO | Acesso limitado (sem valores em R$) |

### Ações Disponíveis

| Ação | Descrição |
|------|-----------|
| Criar | Novo usuário com senha |
| Editar | Alterar nome, email, nível |
| Bloquear | Desativar acesso |
| Desbloquear | Reativar acesso |
| Reset Senha | Gerar nova senha temporária |
| Excluir | Remover usuário |

---

## Log de Auditoria

### Filtros Disponíveis

| Filtro | Tipo |
|--------|------|
| Usuário | Select |
| Entidade | Select (PECA, VENDA, etc.) |
| Ação | Select (CRIAR, EDITAR, etc.) |
| Período | Date range |

### Colunas da Tabela

| Coluna | Descrição |
|--------|-----------|
| Data/Hora | Timestamp da ação |
| Usuário | Nome do usuário |
| Ação | Tipo da ação |
| Entidade | Tipo do registro |
| ID | ID do registro afetado |
| Detalhes | JSON (expansível) |

---

## Critérios de Conclusão

| Critério | Status |
|----------|--------|
| Apenas admin acessa /admin | [ ] |
| Criar usuário funciona | [ ] |
| Editar usuário funciona | [ ] |
| Bloquear/desbloquear usuário | [ ] |
| Resetar senha | [ ] |
| Configurações salvas no banco | [ ] |
| Configurações afetam o sistema | [ ] |
| Log de auditoria com filtros | [ ] |
| Detalhes de auditoria expansíveis | [ ] |

---

## Verificação Final do Sistema

Após concluir todas as fases, executar:

```bash
npm run build && npm run typecheck && npm run lint
```

### Testes End-to-End Manuais

1. Login como admin (admin@mrchrono.com / MrChrono@2026)
2. Criar fornecedor
3. Criar peça com fornecedor (verificar SKU automático)
4. Mudar status da peça (verificar histórico)
5. Criar cliente durante venda
6. Registrar venda
7. Registrar pagamento parcial
8. Verificar dashboard (métricas)
9. Verificar alertas (se consignação)
10. Testar permissões de funcionário (valores ocultos)
11. Testar painel admin (configs, usuários, auditoria)

---

## MVP Concluído

Após finalizar esta fase, o MVP do sistema estará completo com:

- ✅ Autenticação com níveis de acesso
- ✅ Módulo de Fornecedores
- ✅ Módulo de Estoque/Peças
- ✅ Módulo de Vendas
- ✅ Módulo de Clientes
- ✅ Dashboard com métricas
- ✅ Sistema de Alertas
- ✅ Painel Administrativo
- ✅ Auditoria de ações

---

*Atualizar este documento conforme progresso*
