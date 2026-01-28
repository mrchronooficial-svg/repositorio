# Comando: Contexto

Faça um resumo completo do estado atual do projeto para entender rapidamente onde estamos.

## O Que Verificar

### 1. Estrutura do Projeto
- Liste os principais diretórios e arquivos
- Identifique o que já foi criado
- Note o que está faltando

### 2. Estado do Banco de Dados
- Leia o `prisma/schema.prisma`
- Liste as models existentes
- Identifique relações

### 3. APIs Implementadas
- Liste os routers tRPC existentes
- Identifique procedures por router
- Note funcionalidades pendentes

### 4. Páginas/UI
- Liste as páginas existentes em `app/`
- Identifique componentes criados
- Note o que falta implementar

### 5. Configurações
- Verifique `.env.example`
- Verifique configurações de auth
- Note integrações configuradas

### 6. Documentação
- Verifique se `docs/` está atualizado
- Leia `HANDOFF.md` se existir
- Note pendências documentadas

## Output Esperado

```markdown
## Resumo do Projeto: Mr. Chrono

### Progresso Geral
[Estimativa de % completo por módulo]

### Estrutura Atual
[Árvore simplificada de pastas]

### Banco de Dados
- Models: [lista]
- Enums: [lista]
- Relações: [resumo]

### APIs (tRPC)
| Router | Status | Procedures |
|--------|--------|------------|
| peca | ✅/🔄/❌ | list, create, ... |
| ... | ... | ... |

### Páginas
| Rota | Status | Funcionalidade |
|------|--------|----------------|
| /dashboard | ✅/🔄/❌ | ... |
| ... | ... | ... |

### Próximas Prioridades
1. [O que fazer primeiro]
2. [Segundo]
3. [Terceiro]

### Avisos Importantes
[Qualquer coisa que precise de atenção]
```

## Legenda de Status
- ✅ Completo
- 🔄 Em progresso / Parcial
- ❌ Não iniciado

## Quando Usar

- Ao iniciar uma nova sessão
- Quando não lembrar onde parou
- Para planejar próximos passos
- Para reportar progresso
