# Guia de Componentes UI - Sistema Mr. Chrono

> Padrões visuais, componentes e diretrizes de design para manter consistência.

---

## 1. Princípios de Design

### 1.1 Filosofia

| Princípio | Descrição |
|-----------|-----------|
| **Clean** | Interface limpa, sem poluição visual |
| **Minimalista** | Apenas o necessário, sem excessos |
| **Profissional** | Aparência séria e confiável |
| **Funcional** | Priorizar usabilidade sobre estética |

### 1.2 O Que Evitar

- Gradientes chamativos
- Sombras exageradas
- Bordas arredondadas demais
- Animações desnecessárias
- Cores vibrantes sem propósito
- Ícones decorativos

---

## 2. Paleta de Cores

### 2.1 Cores Principais

```css
/* Cores de base */
--background: #FFFFFF;          /* Fundo principal */
--foreground: #0F172A;          /* Texto principal */

/* Cores neutras */
--muted: #F1F5F9;               /* Fundos secundários */
--muted-foreground: #64748B;    /* Texto secundário */

/* Bordas */
--border: #E2E8F0;              /* Bordas padrão */
--border-hover: #CBD5E1;        /* Bordas em hover */

/* Cor de destaque */
--primary: #0F172A;             /* Botões principais */
--primary-foreground: #FFFFFF;  /* Texto em botões */
```

### 2.2 Cores de Status

```css
/* Feedback */
--success: #16A34A;             /* Verde - sucesso */
--success-light: #DCFCE7;       /* Verde claro - fundo */

--warning: #CA8A04;             /* Amarelo - atenção */
--warning-light: #FEF9C3;       /* Amarelo claro - fundo */

--error: #DC2626;               /* Vermelho - erro */
--error-light: #FEE2E2;         /* Vermelho claro - fundo */

--info: #2563EB;                /* Azul - informação */
--info-light: #DBEAFE;          /* Azul claro - fundo */
```

### 2.3 Cores de Status de Peça

```css
/* Status específicos do sistema */
--status-disponivel: #16A34A;   /* Verde */
--status-transito: #CA8A04;     /* Amarelo */
--status-revisao: #2563EB;      /* Azul */
--status-vendida: #64748B;      /* Cinza */
--status-defeito: #DC2626;      /* Vermelho */
--status-perda: #7C2D12;        /* Marrom escuro */
```

---

## 3. Tipografia

### 3.1 Família de Fontes

```css
/* Font stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### 3.2 Escala de Tamanhos

| Nome | Tamanho | Uso |
|------|---------|-----|
| `text-xs` | 12px | Labels, badges |
| `text-sm` | 14px | Texto secundário, tabelas |
| `text-base` | 16px | Texto padrão |
| `text-lg` | 18px | Subtítulos |
| `text-xl` | 20px | Títulos de cards |
| `text-2xl` | 24px | Títulos de página |
| `text-3xl` | 30px | Títulos principais |

### 3.3 Pesos

```css
font-weight: 400; /* Normal - texto */
font-weight: 500; /* Medium - labels, botões */
font-weight: 600; /* Semibold - títulos */
font-weight: 700; /* Bold - destaques */
```

---

## 4. Espaçamento

### 4.1 Escala de Espaçamento

```css
/* Usar classes Tailwind */
space-1: 4px;   /* 0.25rem */
space-2: 8px;   /* 0.5rem */
space-3: 12px;  /* 0.75rem */
space-4: 16px;  /* 1rem */
space-5: 20px;  /* 1.25rem */
space-6: 24px;  /* 1.5rem */
space-8: 32px;  /* 2rem */
space-10: 40px; /* 2.5rem */
space-12: 48px; /* 3rem */
```

### 4.2 Padrões de Uso

| Contexto | Espaçamento |
|----------|-------------|
| Entre ícone e texto | `space-2` (8px) |
| Entre campos de form | `space-4` (16px) |
| Entre seções | `space-6` (24px) |
| Padding de cards | `space-4` ou `space-6` |
| Padding de página | `space-6` ou `space-8` |
| Gap em grids | `space-4` ou `space-6` |

---

## 5. Componentes Base (shadcn/ui)

### 5.1 Botões

```tsx
// Botão primário - ações principais
<Button>Salvar</Button>

// Botão secundário - ações secundárias
<Button variant="outline">Cancelar</Button>

// Botão destrutivo - ações perigosas
<Button variant="destructive">Excluir</Button>

// Botão ghost - ações terciárias
<Button variant="ghost">Ver mais</Button>

// Com ícone
<Button>
  <Plus className="w-4 h-4 mr-2" />
  Nova Peça
</Button>

// Loading state
<Button disabled>
  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  Salvando...
</Button>
```

### 5.2 Inputs

```tsx
// Input básico
<Input placeholder="Digite aqui..." />

// Com label
<div className="space-y-2">
  <Label htmlFor="marca">Marca</Label>
  <Input id="marca" placeholder="Ex: Rolex" />
</div>

// Com erro
<div className="space-y-2">
  <Label htmlFor="cpf">CPF</Label>
  <Input id="cpf" className="border-red-500" />
  <p className="text-sm text-red-500">CPF inválido</p>
</div>

// Monetário
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
    R$
  </span>
  <Input className="pl-10" placeholder="0,00" />
</div>
```

### 5.3 Select

```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="disponivel">Disponível</SelectItem>
    <SelectItem value="transito">Em Trânsito</SelectItem>
    <SelectItem value="revisao">Revisão</SelectItem>
  </SelectContent>
</Select>
```

### 5.4 Cards

```tsx
// Card básico
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo aqui
  </CardContent>
  <CardFooter>
    <Button>Ação</Button>
  </CardFooter>
</Card>

// Card de métrica
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Peças Disponíveis
    </CardTitle>
    <Package className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">127</div>
    <p className="text-xs text-muted-foreground">
      +12 esta semana
    </p>
  </CardContent>
</Card>
```

### 5.5 Tabelas

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">SKU</TableHead>
      <TableHead>Marca</TableHead>
      <TableHead>Modelo</TableHead>
      <TableHead className="text-right">Valor</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">MRC-0001</TableCell>
      <TableCell>Rolex</TableCell>
      <TableCell>Submariner</TableCell>
      <TableCell className="text-right">R$ 75.000</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 5.6 Badges de Status

```tsx
// Componente customizado
const StatusBadge = ({ status }: { status: string }) => {
  const variants = {
    DISPONIVEL: "bg-green-100 text-green-800",
    EM_TRANSITO: "bg-yellow-100 text-yellow-800",
    REVISAO: "bg-blue-100 text-blue-800",
    VENDIDA: "bg-gray-100 text-gray-800",
    DEFEITO: "bg-red-100 text-red-800",
    PERDA: "bg-red-100 text-red-800",
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[status]}`}>
      {status.replace("_", " ")}
    </span>
  )
}
```

---

## 6. Padrões de Layout

### 6.1 Layout Base (Dashboard)

```tsx
<div className="min-h-screen bg-muted/30">
  {/* Header fixo */}
  <header className="sticky top-0 z-50 border-b bg-background">
    <div className="flex h-16 items-center px-6">
      {/* Logo + Nav + Notifications + User */}
    </div>
  </header>
  
  <div className="flex">
    {/* Sidebar */}
    <aside className="hidden w-64 border-r bg-background md:block">
      {/* Menu items */}
    </aside>
    
    {/* Conteúdo principal */}
    <main className="flex-1 p-6">
      {/* Breadcrumbs */}
      {/* Título da página */}
      {/* Conteúdo */}
    </main>
  </div>
</div>
```

### 6.2 Página de Listagem

```tsx
<div className="space-y-6">
  {/* Header da página */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-semibold">Estoque</h1>
      <p className="text-muted-foreground">
        Gerencie suas peças em estoque
      </p>
    </div>
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Nova Peça
    </Button>
  </div>
  
  {/* Filtros */}
  <Card>
    <CardContent className="pt-6">
      <div className="flex gap-4">
        {/* Campos de filtro */}
      </div>
    </CardContent>
  </Card>
  
  {/* Tabela */}
  <Card>
    <CardContent className="p-0">
      <Table>
        {/* ... */}
      </Table>
    </CardContent>
  </Card>
  
  {/* Paginação */}
  <div className="flex justify-end">
    {/* Pagination component */}
  </div>
</div>
```

### 6.3 Formulário

```tsx
<Card>
  <CardHeader>
    <CardTitle>Cadastrar Peça</CardTitle>
    <CardDescription>
      Preencha os dados da nova peça
    </CardDescription>
  </CardHeader>
  <CardContent>
    <form className="space-y-6">
      {/* Grupo de campos */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Campo 1</Label>
          <Input />
        </div>
        <div className="space-y-2">
          <Label>Campo 2</Label>
          <Input />
        </div>
      </div>
      
      {/* Separador visual */}
      <Separator />
      
      {/* Próximo grupo */}
      <div className="space-y-4">
        {/* ... */}
      </div>
    </form>
  </CardContent>
  <CardFooter className="flex justify-end gap-4">
    <Button variant="outline">Cancelar</Button>
    <Button>Salvar</Button>
  </CardFooter>
</Card>
```

---

## 7. Ícones (Lucide React)

### 7.1 Ícones por Contexto

```tsx
// Navegação
import { Home, Package, Users, ShoppingCart, Settings } from "lucide-react"

// Ações
import { Plus, Pencil, Trash2, Archive, Eye, Download } from "lucide-react"

// Status
import { CheckCircle, XCircle, AlertCircle, Clock, Loader2 } from "lucide-react"

// Outros
import { Search, Filter, ChevronDown, ChevronRight, MoreVertical } from "lucide-react"
```

### 7.2 Tamanhos Padrão

| Contexto | Classe | Tamanho |
|----------|--------|---------|
| Dentro de botão | `w-4 h-4` | 16px |
| Menu/navegação | `w-5 h-5` | 20px |
| Cards de métrica | `w-6 h-6` | 24px |
| Ilustrações | `w-8 h-8` | 32px |

---

## 8. Feedback Visual

### 8.1 Loading States

```tsx
// Botão carregando
<Button disabled>
  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  Carregando...
</Button>

// Skeleton para cards
<Card>
  <CardHeader>
    <Skeleton className="h-4 w-[200px]" />
    <Skeleton className="h-3 w-[150px]" />
  </CardHeader>
</Card>

// Skeleton para tabela
<TableRow>
  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
</TableRow>
```

### 8.2 Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Package className="w-12 h-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-medium">Nenhuma peça encontrada</h3>
  <p className="text-muted-foreground mb-4">
    Comece cadastrando sua primeira peça
  </p>
  <Button>
    <Plus className="w-4 h-4 mr-2" />
    Nova Peça
  </Button>
</div>
```

### 8.3 Toasts

```tsx
// Sucesso
toast.success("Peça cadastrada com sucesso!")

// Erro
toast.error("Erro ao salvar. Tente novamente.")

// Atenção
toast.warning("Existem campos não preenchidos")

// Informação
toast.info("Peça movida para revisão")
```

---

## 9. Responsividade

### 9.1 Breakpoints

| Nome | Largura | Uso |
|------|---------|-----|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop grande |

### 9.2 Padrões Mobile (Baixa Prioridade)

```tsx
// Grid responsivo
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Cards */}
</div>

// Sidebar colapsável
<aside className="hidden md:block w-64">
  {/* Sidebar */}
</aside>

// Tabela com scroll horizontal
<div className="overflow-x-auto">
  <Table>
    {/* ... */}
  </Table>
</div>
```

---

*Documento criado em: Janeiro/2026*
*Referência: shadcn/ui, Tailwind CSS, Lucide React*
