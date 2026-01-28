# Roadmap de Implementação - Sistema Mr. Chrono

> Plano detalhado de implementação fase a fase, com estimativas e critérios de conclusão.

---

## Visão Geral das Fases

| Fase | Nome | Duração | Dependência |
|------|------|---------|-------------|
| 1 | Setup Inicial | 1-2 dias | - |
| 2 | Autenticação | 2 dias | Fase 1 |
| 3 | Estoque + Fornecedores | 5 dias | Fase 2 |
| 4 | Vendas + Clientes | 4 dias | Fase 3 |
| 5 | Dashboard + Admin + Alertas | 3 dias | Fase 4 |
| 6 | Polimento (opcional) | 2-3 dias | Fase 5 |

**Total estimado MVP:** 16 dias úteis (3-4 semanas)

---

## Fase 1: Setup Inicial

**Duração estimada:** 1-2 dias

### Checklist

- [ ] Criar projeto Better-T-Stack com comando definido
- [ ] Configurar PostgreSQL local (Orbstack)
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Criar estrutura de pastas conforme arquitetura
- [ ] Instalar dependências adicionais (shadcn, lucide, etc.)
- [ ] Verificar npm run dev/build/typecheck

### Critérios de Conclusão

- Projeto criado e rodando
- Banco de dados conectado
- Build sem erros

---

## Fase 2: Autenticação

**Duração estimada:** 2 dias

### Checklist

- [ ] Configurar Better Auth com email/senha
- [ ] Criar schema de User com nivel de acesso
- [ ] Criar seed com usuário admin
- [ ] Criar página de login
- [ ] Configurar middleware de proteção
- [ ] Criar hooks useSession e usePermissions

### Critérios de Conclusão

- Login funcional
- Sessão persistente
- Rotas protegidas
- Níveis de acesso funcionando

---

## Fase 3: Estoque + Fornecedores

**Duração estimada:** 5 dias

### Checklist

- [ ] Criar models: Fornecedor, Peca, Foto, HistoricoStatus
- [ ] Criar enums: TipoPessoa, OrigemTipo, StatusPeca, etc.
- [ ] Criar router tRPC fornecedor (CRUD completo)
- [ ] Criar router tRPC peca (CRUD + filtros)
- [ ] Implementar geração automática de SKU
- [ ] Criar service de auditoria
- [ ] Criar layout base (header, sidebar)
- [ ] Criar listagem de peças com filtros
- [ ] Criar formulário de cadastro de peça
- [ ] Criar upload de fotos
- [ ] Criar card de detalhes da peça
- [ ] Criar listagem e card de fornecedores

### Critérios de Conclusão

- CRUD completo de fornecedores e peças
- SKU gerado automaticamente
- Upload de fotos funcional
- Histórico de status registrado
- Auditoria funcionando

---

## Fase 4: Vendas + Clientes

**Duração estimada:** 4 dias

### Checklist

- [ ] Criar models: Cliente, Venda, Pagamento
- [ ] Criar enums: FormaPagamento, StatusPagamento, StatusRepasse
- [ ] Criar router tRPC cliente (CRUD + métricas)
- [ ] Criar router tRPC venda (CRUD + pagamentos)
- [ ] Implementar lógica de venda completa
- [ ] Implementar pagamentos parciais
- [ ] Implementar repasse de consignação
- [ ] Implementar devolução (SKU derivado)
- [ ] Criar página de registro de venda
- [ ] Criar listagem de vendas
- [ ] Criar card de detalhes da venda
- [ ] Criar dashboard de clientes (rankings, LTV)
- [ ] Criar listagem e card de clientes

### Critérios de Conclusão

- CRUD completo de clientes e vendas
- Pagamentos parciais funcionando
- Devolução gerando SKU derivado
- Métricas de cliente calculadas
- Valores ocultos para FUNCIONARIO

---

## Fase 5: Dashboard + Admin + Alertas

**Duração estimada:** 3 dias

### Checklist

- [ ] Criar router tRPC dashboard (métricas)
- [ ] Criar página dashboard principal
- [ ] Implementar cálculo de estoque ideal
- [ ] Criar model e router de Alerta
- [ ] Implementar geração de alertas
- [ ] Criar componente de notificações no header
- [ ] Criar router tRPC admin
- [ ] Criar página de gestão de usuários
- [ ] Criar página de configurações
- [ ] Criar página de auditoria

### Critérios de Conclusão

- Dashboard com todas as métricas
- Alertas funcionando
- CRUD de usuários
- Parâmetros configuráveis
- Log de auditoria visível

---

## Fase 6: Polimento (Opcional)

**Duração estimada:** 2-3 dias

### Checklist

- [ ] Revisão de UX em todos os fluxos
- [ ] Tratamento de erros consistente
- [ ] Loading states em todas as operações
- [ ] Empty states (listas vazias)
- [ ] Confirmações para ações destrutivas
- [ ] Testes manuais de todos os fluxos
- [ ] Correção de bugs encontrados

---

## Pós-MVP (Roadmap Futuro)

| Prioridade | Módulo | Descrição |
|------------|--------|-----------|
| Alta | Upload de Imagens | Integrar Cloudinary/S3 |
| Alta | Exportação Excel | Relatórios exportáveis |
| Média | Módulo Financeiro | DRE, fluxo de caixa |
| Média | Módulo Relojoeiro | Fila de revisão, SLA |
| Baixa | Versão Mobile | Responsividade |
| Baixa | Módulo Marketing | Integração Instagram |
| Baixa | Módulo Comunidade | WhatsApp members |

---

*Documento criado em: Janeiro/2026*
*Atualizar conforme progresso do projeto*
