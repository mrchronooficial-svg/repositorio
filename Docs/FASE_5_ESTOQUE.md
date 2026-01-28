# FASE 5: Módulo Estoque/Peças

> Implementar CRUD completo de peças com SKU automático, upload de fotos e histórico.

---

## Informações Gerais

| Item | Valor |
|------|-------|
| **Objetivo** | CRUD de peças com funcionalidades avançadas |
| **Pré-requisitos** | Fase 4 concluída (fornecedores) |
| **Complexidade** | Alta |
| **Dependência** | Fase 4 |

---

## Checklist de Tarefas

### Backend
- [ ] Criar service `packages/api/src/services/sku.service.ts`
- [ ] Criar router `packages/api/src/routers/peca.ts`
- [ ] Atualizar root router

### Frontend
- [ ] Criar API Route de upload `apps/web/src/app/api/upload/route.ts`
- [ ] Criar componente de upload de fotos
- [ ] Criar página de listagem `/estoque`
- [ ] Criar página nova peça `/estoque/novo`
- [ ] Criar página detalhes `/estoque/[id]`
- [ ] Criar tabela de peças
- [ ] Criar formulário de peça
- [ ] Criar dialog de mudança de status
- [ ] Criar componente de histórico

---

## Arquivos a Criar

### Backend

#### 1. Service de SKU

**Arquivo:** `packages/api/src/services/sku.service.ts`

```typescript
import { prisma } from "@gestaomrchrono/db";

/**
 * Gera o próximo SKU sequencial
 * Formato: MRC-0001, MRC-0002, etc.
 */
export async function gerarProximoSKU(): Promise<string> {
  // Buscar último SKU base (sem sufixo de devolução)
  const ultimaPeca = await prisma.peca.findFirst({
    where: {
      skuBase: {
        startsWith: "MRC-",
        not: { contains: "-", },
      },
    },
    orderBy: { createdAt: "desc" },
    select: { skuBase: true },
  });

  let proximoNumero = 1;

  if (ultimaPeca?.skuBase) {
    const match = ultimaPeca.skuBase.match(/MRC-(\d+)/);
    if (match) {
      proximoNumero = parseInt(match[1], 10) + 1;
    }
  }

  const sku = `MRC-${proximoNumero.toString().padStart(4, "0")}`;
  return sku;
}

/**
 * Gera SKU derivado para devolução
 * Formato: MRC-0001-1, MRC-0001-2, etc.
 */
export async function gerarSKUDevolucao(skuBase: string): Promise<string> {
  // Contar devoluções existentes
  const devolucoes = await prisma.peca.count({
    where: {
      skuBase,
      sku: { not: skuBase },
    },
  });

  const sufixo = devolucoes + 1;
  return `${skuBase}-${sufixo}`;
}
```

---

#### 2. Router tRPC Peça

**Arquivo:** `packages/api/src/routers/peca.ts`

**Principais Procedures:**

| Procedure | Tipo | Descrição |
|-----------|------|-----------|
| `list` | Query | Lista peças com filtros e paginação |
| `getById` | Query | Busca peça por ID com fotos e histórico |
| `getBySku` | Query | Busca peça por SKU |
| `create` | Mutation | Cadastra nova peça (gera SKU automático) |
| `update` | Mutation | Atualiza dados da peça |
| `updateStatus` | Mutation | Altera status/localização (registra histórico) |
| `archive` | Mutation | Arquiva peça (soft delete) |
| `delete` | Mutation | Exclui peça permanentemente |
| `getHistorico` | Query | Retorna histórico de status |
| `getLocalizacoes` | Query | Lista de localizações disponíveis |

**Regras de Negócio:**
- SKU gerado automaticamente no formato MRC-0001
- Mínimo 1 foto obrigatória
- Fornecedor obrigatório
- Se consignação, valor de repasse obrigatório
- Histórico de status registrado em cada mudança

---

### Frontend

#### 3. API Route de Upload

**Arquivo:** `apps/web/src/app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máximo 5MB)" },
        { status: 400 }
      );
    }

    // Criar diretório se não existir
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Gerar nome único
    const ext = file.name.split(".").pop();
    const filename = `${nanoid()}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Salvar arquivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Retornar URL
    const url = `/uploads/${filename}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}
```

---

#### 4. Componente de Upload de Fotos

**Arquivo:** `apps/web/src/components/forms/foto-upload.tsx`

Features:
- Drag and drop
- Preview das fotos
- Reordenar fotos
- Remover foto
- Indicador de upload em progresso
- Validação de tamanho e tipo

---

#### 5. Páginas do Módulo

| Arquivo | Descrição |
|---------|-----------|
| `apps/web/src/app/(dashboard)/estoque/page.tsx` | Listagem com filtros e métricas |
| `apps/web/src/app/(dashboard)/estoque/novo/page.tsx` | Formulário de cadastro |
| `apps/web/src/app/(dashboard)/estoque/[id]/page.tsx` | Detalhes com galeria e histórico |

---

#### 6. Componentes

| Arquivo | Descrição |
|---------|-----------|
| `components/tables/pecas-table.tsx` | Tabela com thumbnail, SKU, status |
| `components/forms/peca-form.tsx` | Formulário completo com busca de fornecedor |
| `components/cards/peca-card.tsx` | Card de detalhes |
| `components/dialogs/status-dialog.tsx` | Dialog para mudança de status |
| `components/historico-status.tsx` | Timeline de mudanças |

---

## Transições de Status Permitidas

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

---

## Critérios de Conclusão

| Critério | Status |
|----------|--------|
| SKU gerado automaticamente (MRC-0001) | [ ] |
| Upload de fotos funciona | [ ] |
| Mínimo 1 foto obrigatória | [ ] |
| Listar peças com todos os filtros | [ ] |
| Criar peça com fornecedor existente | [ ] |
| Criar peça com fornecedor novo (inline) | [ ] |
| Editar peça | [ ] |
| Mudar status com registro no histórico | [ ] |
| Arquivar peça (soft delete) | [ ] |
| Histórico visualizado em timeline | [ ] |
| Funcionário NÃO vê valores | [ ] |

---

## Próxima Fase

Após concluir esta fase, seguir para **FASE 6: Módulo Vendas + Clientes**.

---

*Atualizar este documento conforme progresso*
