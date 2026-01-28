# FASE 3: Infraestrutura de Layout e Utilitários

> Criar o layout base do dashboard, componentes de UI adicionais e utilitários.

---

## Informações Gerais

| Item | Valor |
|------|-------|
| **Objetivo** | Estruturar layout e criar utilitários reutilizáveis |
| **Pré-requisitos** | Fase 2 concluída (autenticação) |
| **Complexidade** | Média |
| **Dependência** | Fase 2 |

---

## Checklist de Tarefas

- [ ] Instalar componentes shadcn adicionais
- [ ] Criar layout do dashboard
- [ ] Criar header com notificações
- [ ] Criar sidebar com menu
- [ ] Criar breadcrumbs
- [ ] Criar utilitários de formatação
- [ ] Criar utilitários de validação
- [ ] Criar constantes do sistema
- [ ] Criar componente StatusBadge

---

## Componentes shadcn a Instalar

Executar os comandos:

```bash
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add textarea
npx shadcn@latest add tabs
npx shadcn@latest add pagination
npx shadcn@latest add avatar
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add form
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add calendar
npx shadcn@latest add command
npx shadcn@latest add sheet
```

---

## Arquivos a Criar

### 1. Layout do Dashboard

**Arquivo:** `apps/web/src/app/(dashboard)/layout.tsx`

```typescript
import { redirect } from "next/navigation";
import { auth } from "@gestaomrchrono/auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={session.user} />
      <div className="flex">
        <Sidebar userLevel={session.user.nivel} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

### 2. Header

**Arquivo:** `apps/web/src/components/layout/header.tsx`

```typescript
"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { Notifications } from "./notifications";
import { UserMenu } from "./user-menu";

interface HeaderProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    nivel: string;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">Mr. Chrono</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notificações */}
        <Notifications />

        {/* Menu do Usuário */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
```

---

### 3. Sidebar

**Arquivo:** `apps/web/src/components/layout/sidebar.tsx`

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userLevel: string;
}

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Estoque",
    href: "/estoque",
    icon: Package,
  },
  {
    label: "Vendas",
    href: "/vendas",
    icon: ShoppingCart,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    label: "Fornecedores",
    href: "/fornecedores",
    icon: Truck,
  },
];

const adminItems = [
  {
    label: "Admin",
    href: "/admin",
    icon: Settings,
  },
];

export function Sidebar({ userLevel }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userLevel === "ADMINISTRADOR";

  const items = isAdmin ? [...menuItems, ...adminItems] : menuItems;

  return (
    <aside className="w-64 min-h-[calc(100vh-3.5rem)] border-r bg-background">
      <nav className="flex flex-col gap-1 p-4">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

### 4. Breadcrumbs

**Arquivo:** `apps/web/src/components/layout/breadcrumbs.tsx`

```typescript
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/dashboard"
        className="hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
```

---

### 5. Notificações

**Arquivo:** `apps/web/src/components/layout/notifications.tsx`

```typescript
"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/utils/trpc";

export function Notifications() {
  // Será implementado na Fase 7
  const count = 0; // trpc.alerta.getCount.useQuery()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="font-medium mb-2">Notificações</div>
        <div className="text-sm text-muted-foreground">
          Nenhuma notificação no momento.
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

### 6. User Menu

**Arquivo:** `apps/web/src/components/layout/user-menu.tsx`

```typescript
"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";

interface UserMenuProps {
  user: {
    name: string | null;
    email: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name || "Usuário"}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### 7. Utilitários de Formatação

**Arquivo:** `apps/web/src/lib/formatters.ts`

```typescript
/**
 * Formata valor para moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata CPF: 123.456.789-00
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formata CNPJ: 12.345.678/0001-00
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    "$1.$2.$3/$4-$5"
  );
}

/**
 * Formata CPF ou CNPJ baseado no tamanho
 */
export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    return formatCPF(digits);
  }
  return formatCNPJ(digits);
}

/**
 * Formata telefone: (11) 99999-9999 ou (11) 9999-9999
 */
export function formatTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

/**
 * Formata CEP: 12345-678
 */
export function formatCEP(cep: string): string {
  const digits = cep.replace(/\D/g, "");
  return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
}

/**
 * Formata data: 25/01/2026
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

/**
 * Formata data e hora: 25/01/2026 14:30
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/**
 * Formata data relativa: há 2 dias, há 1 hora
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) {
    return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  }
  if (diffHours > 0) {
    return `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  }
  if (diffMinutes > 0) {
    return `há ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
  }
  return "agora";
}
```

---

### 8. Utilitários de Validação

**Arquivo:** `apps/web/src/lib/validators.ts`

```typescript
/**
 * Valida CPF (11 dígitos + dígitos verificadores)
 */
export function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");

  if (digits.length !== 11) return false;

  // Rejeita sequências repetidas
  if (/^(\d)\1+$/.test(digits)) return false;

  // Validação dos dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digits[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digits[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits[10])) return false;

  return true;
}

/**
 * Valida CNPJ (14 dígitos + dígitos verificadores)
 */
export function validarCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");

  if (digits.length !== 14) return false;

  // Rejeita sequências repetidas
  if (/^(\d)\1+$/.test(digits)) return false;

  // Validação dos dígitos verificadores
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(digits[i]) * pesos1[i];
  }
  let resto = soma % 11;
  const dv1 = resto < 2 ? 0 : 11 - resto;
  if (dv1 !== parseInt(digits[12])) return false;

  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(digits[i]) * pesos2[i];
  }
  resto = soma % 11;
  const dv2 = resto < 2 ? 0 : 11 - resto;
  if (dv2 !== parseInt(digits[13])) return false;

  return true;
}

/**
 * Valida CPF ou CNPJ baseado no tamanho
 */
export function validarCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) {
    return validarCPF(digits);
  }
  if (digits.length === 14) {
    return validarCNPJ(digits);
  }
  return false;
}

/**
 * Valida telefone brasileiro (10 ou 11 dígitos)
 */
export function validarTelefone(telefone: string): boolean {
  const digits = telefone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * Valida CEP (8 dígitos)
 */
export function validarCEP(cep: string): boolean {
  const digits = cep.replace(/\D/g, "");
  return digits.length === 8;
}

/**
 * Valida email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

---

### 9. Constantes

**Arquivo:** `apps/web/src/lib/constants.ts`

```typescript
export const STATUS_PECA = {
  DISPONIVEL: "DISPONIVEL",
  EM_TRANSITO: "EM_TRANSITO",
  REVISAO: "REVISAO",
  VENDIDA: "VENDIDA",
  DEFEITO: "DEFEITO",
  PERDA: "PERDA",
} as const;

export const STATUS_PECA_LABELS: Record<string, string> = {
  DISPONIVEL: "Disponível",
  EM_TRANSITO: "Em Trânsito",
  REVISAO: "Em Revisão",
  VENDIDA: "Vendida",
  DEFEITO: "Defeito",
  PERDA: "Perda",
};

export const STATUS_PECA_COLORS: Record<string, string> = {
  DISPONIVEL: "bg-green-100 text-green-800",
  EM_TRANSITO: "bg-blue-100 text-blue-800",
  REVISAO: "bg-yellow-100 text-yellow-800",
  VENDIDA: "bg-gray-100 text-gray-800",
  DEFEITO: "bg-red-100 text-red-800",
  PERDA: "bg-red-100 text-red-800",
};

export const STATUS_PAGAMENTO_LABELS: Record<string, string> = {
  PAGO: "Pago",
  PARCIAL: "Parcial",
  NAO_PAGO: "Não Pago",
};

export const STATUS_PAGAMENTO_COLORS: Record<string, string> = {
  PAGO: "bg-green-100 text-green-800",
  PARCIAL: "bg-yellow-100 text-yellow-800",
  NAO_PAGO: "bg-red-100 text-red-800",
};

export const STATUS_REPASSE_LABELS: Record<string, string> = {
  FEITO: "Feito",
  PARCIAL: "Parcial",
  PENDENTE: "Pendente",
};

export const STATUS_REPASSE_COLORS: Record<string, string> = {
  FEITO: "bg-green-100 text-green-800",
  PARCIAL: "bg-yellow-100 text-yellow-800",
  PENDENTE: "bg-red-100 text-red-800",
};

export const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  PIX: "PIX",
  CREDITO_VISTA: "Crédito à Vista",
  CREDITO_PARCELADO: "Crédito Parcelado",
};

export const TIPO_PESSOA_LABELS: Record<string, string> = {
  PESSOA_FISICA: "Pessoa Física",
  PESSOA_JURIDICA: "Pessoa Jurídica",
};

export const ORIGEM_TIPO_LABELS: Record<string, string> = {
  COMPRA: "Compra",
  CONSIGNACAO: "Consignação",
};

export const ORIGEM_CANAL_LABELS: Record<string, string> = {
  PESSOA_FISICA: "Pessoa Física",
  LEILAO_BRASIL: "Leilão Brasil",
  EBAY: "eBay",
};

export const SCORE_LABELS: Record<string, string> = {
  EXCELENTE: "Excelente",
  BOM: "Bom",
  REGULAR: "Regular",
  RUIM: "Ruim",
};

export const SCORE_COLORS: Record<string, string> = {
  EXCELENTE: "bg-green-100 text-green-800",
  BOM: "bg-blue-100 text-blue-800",
  REGULAR: "bg-yellow-100 text-yellow-800",
  RUIM: "bg-red-100 text-red-800",
};

export const LOCALIZACOES_PADRAO = [
  "Rafael",
  "Pedro",
  "Heitor",
  "Tampograth",
  "Fornecedor",
  "Cliente Final",
];
```

---

### 10. StatusBadge

**Arquivo:** `apps/web/src/components/status-badge.tsx`

```typescript
import { cn } from "@/lib/utils";
import {
  STATUS_PECA_LABELS,
  STATUS_PECA_COLORS,
  STATUS_PAGAMENTO_LABELS,
  STATUS_PAGAMENTO_COLORS,
  STATUS_REPASSE_LABELS,
  STATUS_REPASSE_COLORS,
  SCORE_LABELS,
  SCORE_COLORS,
} from "@/lib/constants";

type StatusType = "peca" | "pagamento" | "repasse" | "score";

interface StatusBadgeProps {
  type: StatusType;
  status: string;
  size?: "sm" | "md";
}

const labelsMap: Record<StatusType, Record<string, string>> = {
  peca: STATUS_PECA_LABELS,
  pagamento: STATUS_PAGAMENTO_LABELS,
  repasse: STATUS_REPASSE_LABELS,
  score: SCORE_LABELS,
};

const colorsMap: Record<StatusType, Record<string, string>> = {
  peca: STATUS_PECA_COLORS,
  pagamento: STATUS_PAGAMENTO_COLORS,
  repasse: STATUS_REPASSE_COLORS,
  score: SCORE_COLORS,
};

export function StatusBadge({ type, status, size = "md" }: StatusBadgeProps) {
  const labels = labelsMap[type];
  const colors = colorsMap[type];

  const label = labels[status] || status;
  const color = colors[status] || "bg-gray-100 text-gray-800";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-sm"
      )}
    >
      {label}
    </span>
  );
}
```

---

## Critérios de Conclusão

| Critério | Status |
|----------|--------|
| Todos componentes shadcn instalados | [ ] |
| Layout com sidebar e header renderiza | [ ] |
| Sidebar mostra menu conforme nível | [ ] |
| Breadcrumbs funciona | [ ] |
| Formatadores funcionam | [ ] |
| Validadores retornam valores corretos | [ ] |
| StatusBadge exibe corretamente | [ ] |

---

## Próxima Fase

Após concluir esta fase, seguir para **FASE 4: Módulo Fornecedores**.

---

*Atualizar este documento conforme progresso*
