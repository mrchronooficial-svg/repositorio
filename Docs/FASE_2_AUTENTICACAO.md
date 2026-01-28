# FASE 2: Autenticação e Permissões

> Expandir a autenticação existente para suportar níveis de acesso e proteger rotas.

---

## Informações Gerais

| Item | Valor |
|------|-------|
| **Objetivo** | Implementar sistema de permissões por nível de acesso |
| **Pré-requisitos** | Fase 1 concluída (banco de dados) |
| **Complexidade** | Média |
| **Dependência** | Fase 1 |

---

## Checklist de Tarefas

- [ ] Atualizar `packages/api/src/context.ts` para incluir dados do usuário
- [ ] Criar procedures por nível em `packages/api/src/index.ts`
- [ ] Criar hook `apps/web/src/hooks/use-permissions.ts`
- [ ] Criar hook `apps/web/src/hooks/use-session.ts`
- [ ] Criar middleware `apps/web/middleware.ts`
- [ ] Testar proteção de rotas

---

## Arquivos a Criar/Modificar

### 1. Atualizar Context do tRPC

**Arquivo:** `packages/api/src/context.ts`

```typescript
import { NextRequest } from "next/server";
import { auth } from "@gestaomrchrono/auth";
import { prisma } from "@gestaomrchrono/db";

export async function createContext(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  // Buscar usuário completo com nível
  let user = null;
  if (session?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        nivel: true,
      },
    });
  }

  return {
    session,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

---

### 2. Criar Procedures por Nível

**Arquivo:** `packages/api/src/index.ts`

Adicionar após os procedures existentes:

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Procedure protegido - requer autenticação
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar logado para acessar este recurso",
    });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  });
});

// Procedure para Admin apenas
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.nivel !== "ADMINISTRADOR") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem acessar este recurso",
    });
  }
  return next({ ctx });
});

// Procedure para Admin ou Sócio
export const socioOuAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["ADMINISTRADOR", "SOCIO"].includes(ctx.user.nivel)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para acessar este recurso",
    });
  }
  return next({ ctx });
});
```

---

### 3. Criar Hook de Permissões

**Arquivo:** `apps/web/src/hooks/use-permissions.ts`

```typescript
"use client";

import { useSession } from "./use-session";

export type NivelAcesso = "ADMINISTRADOR" | "SOCIO" | "FUNCIONARIO";

export interface Permissions {
  // Níveis
  isAdmin: boolean;
  isSocio: boolean;
  isFuncionario: boolean;

  // Permissões de visualização
  podeVerValores: boolean;

  // Permissões de ação
  podeExcluir: boolean;
  podeEditarVendida: boolean;
  podeAcessarAdmin: boolean;
  podeCancelarVenda: boolean;
  podeRegistrarRepasse: boolean;

  // Nível atual
  nivel: NivelAcesso | null;
}

export function usePermissions(): Permissions {
  const { data: session, isPending } = useSession();

  const nivel = session?.user?.nivel as NivelAcesso | undefined;

  const isAdmin = nivel === "ADMINISTRADOR";
  const isSocio = nivel === "SOCIO";
  const isFuncionario = nivel === "FUNCIONARIO";

  // Sócio e Admin podem ver valores em R$
  const podeVerValores = isAdmin || isSocio;

  // Sócio e Admin podem excluir/arquivar
  const podeExcluir = isAdmin || isSocio;

  // Sócio e Admin podem editar peça vendida
  const podeEditarVendida = isAdmin || isSocio;

  // Apenas Admin acessa painel admin
  const podeAcessarAdmin = isAdmin;

  // Sócio e Admin podem cancelar vendas
  const podeCancelarVenda = isAdmin || isSocio;

  // Sócio e Admin podem registrar repasse
  const podeRegistrarRepasse = isAdmin || isSocio;

  return {
    isAdmin,
    isSocio,
    isFuncionario,
    podeVerValores,
    podeExcluir,
    podeEditarVendida,
    podeAcessarAdmin,
    podeCancelarVenda,
    podeRegistrarRepasse,
    nivel: nivel ?? null,
  };
}
```

---

### 4. Criar Hook de Sessão

**Arquivo:** `apps/web/src/hooks/use-session.ts`

```typescript
"use client";

import { authClient } from "@/lib/auth-client";

export function useSession() {
  return authClient.useSession();
}

export function useUser() {
  const { data: session, ...rest } = useSession();
  return {
    user: session?.user ?? null,
    ...rest,
  };
}
```

---

### 5. Criar Middleware de Rotas

**Arquivo:** `apps/web/middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@gestaomrchrono/auth";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rotas públicas - não precisa autenticação
  const publicPaths = ["/", "/login", "/api/auth"];
  const isPublicPath = publicPaths.some(
    (p) => path === p || path.startsWith("/api/auth")
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Verificar sessão
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Sem sessão, redireciona para login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Rotas admin - verificar nível
  if (path.startsWith("/admin")) {
    // Buscar nível do usuário
    // Nota: Em produção, o nível deve estar na sessão ou em um cache
    if (session.user?.nivel !== "ADMINISTRADOR") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
```

---

### 6. Componente de Verificação de Permissão

**Arquivo:** `apps/web/src/components/permission-gate.tsx`

```typescript
"use client";

import { usePermissions, type Permissions } from "@/hooks/use-permissions";
import { ReactNode } from "react";

interface PermissionGateProps {
  children: ReactNode;
  /** Permissão necessária para exibir o conteúdo */
  permission: keyof Omit<Permissions, "nivel">;
  /** Conteúdo alternativo se não tiver permissão */
  fallback?: ReactNode;
}

export function PermissionGate({
  children,
  permission,
  fallback = null,
}: PermissionGateProps) {
  const permissions = usePermissions();

  if (!permissions[permission]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Uso:
// <PermissionGate permission="podeVerValores">
//   <span>R$ 10.000,00</span>
// </PermissionGate>
```

---

### 7. Componente de Valor Protegido

**Arquivo:** `apps/web/src/components/valor-protegido.tsx`

```typescript
"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters";

interface ValorProtegidoProps {
  valor: number;
  /** Texto a exibir se não tiver permissão */
  placeholder?: string;
}

export function ValorProtegido({
  valor,
  placeholder = "---",
}: ValorProtegidoProps) {
  const { podeVerValores } = usePermissions();

  if (!podeVerValores) {
    return <span className="text-muted-foreground">{placeholder}</span>;
  }

  return <span>{formatCurrency(valor)}</span>;
}
```

---

## Matriz de Permissões

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

---

## Critérios de Conclusão

| Critério | Status |
|----------|--------|
| Login funciona e redireciona para /dashboard | [ ] |
| Usuário admin consegue acessar /admin | [ ] |
| Usuário funcionário NÃO consegue acessar /admin | [ ] |
| Hook usePermissions retorna valores corretos | [ ] |
| Middleware bloqueia rotas não autorizadas | [ ] |
| Componente ValorProtegido oculta valores para funcionário | [ ] |

---

## Testes Manuais

1. **Teste de Login**
   - Acessar /login
   - Fazer login com admin@mrchrono.com
   - Verificar redirecionamento para /dashboard

2. **Teste de Permissão Admin**
   - Logado como admin, acessar /admin
   - Deve exibir página normalmente

3. **Teste de Bloqueio**
   - Criar usuário funcionário
   - Logar como funcionário
   - Tentar acessar /admin
   - Deve redirecionar para /dashboard

4. **Teste de Valores Ocultos**
   - Logado como funcionário
   - Acessar listagem de peças
   - Valores em R$ devem estar ocultos

---

## Próxima Fase

Após concluir esta fase, seguir para **FASE 3: Infraestrutura de Layout e Utilitários**.

---

*Atualizar este documento conforme progresso*
