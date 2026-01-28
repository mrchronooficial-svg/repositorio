# FASE 1: Banco de Dados e Schema Prisma

> Criar o schema completo do banco de dados com todos os 16 models, enums e relações.

---

## Informações Gerais

| Item | Valor |
|------|-------|
| **Objetivo** | Estruturar todo o banco de dados do sistema |
| **Pré-requisitos** | Projeto inicializado, PostgreSQL rodando |
| **Complexidade** | Média |
| **Dependência** | Nenhuma |

---

## Checklist de Tarefas

- [ ] Criar arquivo `packages/db/prisma/schema/negocio.prisma` com todos os enums
- [ ] Criar todos os models no schema
- [ ] Modificar `packages/db/prisma/schema/auth.prisma` para adicionar campo `nivel`
- [ ] Criar arquivo `packages/db/prisma/seed.ts`
- [ ] Rodar `npm run db:push`
- [ ] Rodar `npm run db:generate`
- [ ] Rodar `npm run db:seed`
- [ ] Verificar tabelas no Prisma Studio

---

## Arquivos a Criar/Modificar

### 1. Schema Prisma Principal

**Arquivo:** `packages/db/prisma/schema/negocio.prisma`

#### Enums a Criar

```prisma
enum NivelAcesso {
  ADMINISTRADOR
  SOCIO
  FUNCIONARIO
}

enum TipoPessoa {
  PESSOA_FISICA
  PESSOA_JURIDICA
}

enum OrigemTipo {
  COMPRA
  CONSIGNACAO
}

enum OrigemCanal {
  PESSOA_FISICA
  LEILAO_BRASIL
  EBAY
}

enum StatusPeca {
  DISPONIVEL
  EM_TRANSITO
  REVISAO
  VENDIDA
  DEFEITO
  PERDA
}

enum ScoreFornecedor {
  EXCELENTE
  BOM
  REGULAR
  RUIM
}

enum FormaPagamento {
  PIX
  CREDITO_VISTA
  CREDITO_PARCELADO
}

enum StatusPagamento {
  PAGO
  PARCIAL
  NAO_PAGO
}

enum StatusRepasse {
  FEITO
  PARCIAL
  PENDENTE
}

enum TipoAlerta {
  ESTOQUE_BAIXO
  RELOJOEIRO_DEMORADO
  REPASSE_PENDENTE
}
```

#### Models a Criar

**Model Fornecedor:**
```prisma
model Fornecedor {
  id          String            @id @default(cuid())
  tipo        TipoPessoa
  nome        String
  cpfCnpj     String            @unique
  telefone    String
  email       String?

  // Endereço
  cep         String
  rua         String
  numero      String
  complemento String?
  bairro      String
  cidade      String
  estado      String            @db.Char(2)

  score       ScoreFornecedor?
  arquivado   Boolean           @default(false)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  // Relações
  pecas       Peca[]

  @@index([cpfCnpj])
  @@index([arquivado])
  @@map("fornecedores")
}
```

**Model Cliente:**
```prisma
model Cliente {
  id              String      @id @default(cuid())
  tipo            TipoPessoa
  nome            String
  cpfCnpj         String      @unique
  dataNascimento  DateTime?   // Obrigatório se PF
  telefone        String
  email           String?

  // Endereço
  cep             String
  rua             String
  numero          String
  complemento     String?
  bairro          String
  cidade          String
  estado          String      @db.Char(2)

  arquivado       Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relações
  vendas          Venda[]

  @@index([cpfCnpj])
  @@index([arquivado])
  @@map("clientes")
}
```

**Model Peca:**
```prisma
model Peca {
  id                  String        @id @default(cuid())

  // SKU
  sku                 String        @unique
  skuBase             String        // SKU original (sem sufixo de devolução)
  numeroDevolucoes    Int           @default(0)

  // Dados do relógio
  marca               String
  modelo              String
  ano                 Int?
  tamanhoCaixa        Float         // em mm
  materialCaixa       String?
  materialPulseira    String?

  // Valores
  valorCompra         Decimal       @db.Decimal(10, 2)
  valorEstimadoVenda  Decimal       @db.Decimal(10, 2)

  // Origem
  origemTipo          OrigemTipo
  origemCanal         OrigemCanal?
  valorRepasse        Decimal?      @db.Decimal(10, 2) // Para consignação

  // Status e localização
  status              StatusPeca    @default(EM_TRANSITO)
  localizacao         String        @default("Fornecedor")

  // Controle
  arquivado           Boolean       @default(false)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  // Relações
  fornecedorId        String
  fornecedor          Fornecedor    @relation(fields: [fornecedorId], references: [id])

  fotos               Foto[]
  historicoStatus     HistoricoStatus[]
  venda               Venda?

  @@index([sku])
  @@index([status])
  @@index([localizacao])
  @@index([arquivado])
  @@index([fornecedorId])
  @@map("pecas")
}
```

**Model Foto:**
```prisma
model Foto {
  id        String   @id @default(cuid())
  url       String
  ordem     Int      @default(0)
  pecaId    String
  peca      Peca     @relation(fields: [pecaId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([pecaId])
  @@map("fotos")
}
```

**Model HistoricoStatus:**
```prisma
model HistoricoStatus {
  id                  String      @id @default(cuid())

  pecaId              String
  peca                Peca        @relation(fields: [pecaId], references: [id], onDelete: Cascade)

  statusAnterior      StatusPeca?
  statusNovo          StatusPeca
  localizacaoAnterior String?
  localizacaoNova     String?

  userId              String?
  user                User?       @relation(fields: [userId], references: [id])

  createdAt           DateTime    @default(now())

  @@index([pecaId])
  @@index([createdAt])
  @@map("historico_status")
}
```

**Model Venda:**
```prisma
model Venda {
  id                String          @id @default(cuid())

  // Peça vendida (1:1)
  pecaId            String          @unique
  peca              Peca            @relation(fields: [pecaId], references: [id])

  // Cliente
  clienteId         String
  cliente           Cliente         @relation(fields: [clienteId], references: [id])

  // Valores
  valorOriginal     Decimal         @db.Decimal(10, 2)
  valorDesconto     Decimal?        @db.Decimal(10, 2)
  valorFinal        Decimal         @db.Decimal(10, 2)

  // Pagamento
  formaPagamento    FormaPagamento
  parcelas          Int?            // null se Pix ou crédito à vista
  taxaMDR           Decimal         @db.Decimal(5, 2)
  statusPagamento   StatusPagamento @default(NAO_PAGO)

  // Consignação (repasse ao fornecedor)
  valorRepasseDevido  Decimal?      @db.Decimal(10, 2)
  valorRepasseFeito   Decimal?      @db.Decimal(10, 2)
  statusRepasse       StatusRepasse?
  dataRepasse         DateTime?

  // Cancelamento/Devolução
  cancelada         Boolean         @default(false)
  dataCancelamento  DateTime?

  // Datas
  dataVenda         DateTime        @default(now())
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  // Relações
  pagamentos        Pagamento[]

  @@index([clienteId])
  @@index([dataVenda])
  @@index([statusPagamento])
  @@index([cancelada])
  @@map("vendas")
}
```

**Model Pagamento:**
```prisma
model Pagamento {
  id        String   @id @default(cuid())
  vendaId   String
  venda     Venda    @relation(fields: [vendaId], references: [id], onDelete: Cascade)
  valor     Decimal  @db.Decimal(10, 2)
  data      DateTime @default(now())
  createdAt DateTime @default(now())

  @@index([vendaId])
  @@map("pagamentos")
}
```

**Model Configuracao:**
```prisma
model Configuracao {
  id        String   @id @default(cuid())
  chave     String   @unique
  valor     String
  updatedAt DateTime @updatedAt

  @@map("configuracoes")
}
```

**Model Alerta:**
```prisma
model Alerta {
  id          String      @id @default(cuid())
  tipo        TipoAlerta
  titulo      String
  mensagem    String
  entidade    String?     // Ex: "Peca", "Venda"
  entidadeId  String?     // ID relacionado
  lido        Boolean     @default(false)
  createdAt   DateTime    @default(now())

  @@index([lido])
  @@index([tipo])
  @@index([createdAt])
  @@map("alertas")
}
```

**Model Auditoria:**
```prisma
model Auditoria {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  acao        String   // CRIAR, EDITAR, EXCLUIR, etc.
  entidade    String   // PECA, VENDA, CLIENTE, etc.
  entidadeId  String?  // ID do registro afetado
  detalhes    String?  // JSON com dados adicionais
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([entidade])
  @@index([createdAt])
  @@map("auditorias")
}
```

---

### 2. Modificar Model User

**Arquivo:** `packages/db/prisma/schema/auth.prisma`

Adicionar ao model User existente:

```prisma
model User {
  // ... campos existentes do Better Auth ...

  nivel         NivelAcesso @default(FUNCIONARIO)

  // Relações
  auditorias    Auditoria[]
  historicos    HistoricoStatus[]
}
```

---

### 3. Criar Seed

**Arquivo:** `packages/db/prisma/seed.ts`

```typescript
import { PrismaClient, NivelAcesso } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  // Criar usuário admin
  const senhaHash = await hash('MrChrono@2026', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mrchrono.com' },
    update: {},
    create: {
      email: 'admin@mrchrono.com',
      name: 'Administrador',
      nivel: NivelAcesso.ADMINISTRADOR,
      // Se Better Auth gerencia senha, ajustar conforme necessário
    },
  })

  console.log('Usuario admin criado:', admin.email)

  // Criar configurações padrão
  const configuracoes = [
    { chave: 'taxa_mdr', valor: '4' },
    { chave: 'lead_time_dias', valor: '20' },
    { chave: 'meta_vendas_semana', valor: '10' },
    { chave: 'localizacoes', valor: 'Rafael,Pedro,Heitor,Tampograth,Fornecedor,Cliente Final' },
    { chave: 'alerta_relojoeiro_dias', valor: '14' },
  ]

  for (const config of configuracoes) {
    await prisma.configuracao.upsert({
      where: { chave: config.chave },
      update: { valor: config.valor },
      create: config,
    })
  }

  console.log('Configuracoes padrao criadas')
  console.log('Seed completo!')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## Comandos para Executar

```bash
# 1. Sincronizar schema com banco
npm run db:push

# 2. Gerar Prisma Client
npm run db:generate

# 3. Rodar seed
npm run db:seed

# 4. Verificar tabelas (abre GUI)
npm run db:studio
```

---

## Critérios de Conclusão

| Critério | Status |
|----------|--------|
| `npm run db:push` executa sem erros | [ ] |
| `npm run db:generate` gera Prisma Client | [ ] |
| `npm run db:seed` cria usuário admin | [ ] |
| Prisma Studio mostra todas as 12 tabelas | [ ] |
| Todas as relações estão corretas | [ ] |
| Índices criados conforme schema | [ ] |

---

## Tabelas Esperadas no Banco

1. `users` (modificado do Better Auth)
2. `fornecedores`
3. `clientes`
4. `pecas`
5. `fotos`
6. `historico_status`
7. `vendas`
8. `pagamentos`
9. `configuracoes`
10. `alertas`
11. `auditorias`
12. Tabelas do Better Auth (session, account, verification)

---

## Próxima Fase

Após concluir esta fase, seguir para **FASE 2: Autenticação e Permissões**.

---

*Atualizar este documento conforme progresso*
