# Comando: Verificar

Execute uma verificação completa do projeto para garantir que tudo está funcionando.

## Passos de Verificação

### 1. Verificar TypeScript
```bash
npm run typecheck
```
- Deve completar sem erros
- Se houver erros, liste-os e proponha correções

### 2. Verificar ESLint
```bash
npm run lint
```
- Deve completar sem erros graves
- Warnings são aceitáveis, mas anote-os

### 3. Verificar Build
```bash
npm run build
```
- Deve completar com sucesso
- Se falhar, identifique o problema

### 4. Verificar Prisma Schema
```bash
npx prisma validate
```
- Schema deve estar válido
- Se houver problemas, corrija-os

### 5. Verificar Conexão com Banco
```bash
npx prisma db push --dry-run
```
- Deve conectar com sucesso
- Se falhar, verifique DATABASE_URL

## Output Esperado

Retorne um relatório no formato:

```
## Relatório de Verificação

| Check | Status | Notas |
|-------|--------|-------|
| TypeScript | ✅/❌ | ... |
| ESLint | ✅/❌ | ... |
| Build | ✅/❌ | ... |
| Prisma Schema | ✅/❌ | ... |
| Conexão DB | ✅/❌ | ... |

### Problemas Encontrados
[Lista de problemas, se houver]

### Ações Recomendadas
[O que fazer para resolver]
```

## Quando Usar

- Antes de fazer commit
- Após mudanças significativas
- Quando algo parecer quebrado
- Ao retomar trabalho após pausa
