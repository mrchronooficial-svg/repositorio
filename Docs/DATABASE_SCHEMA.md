# Schema Prisma - Sistema Mr. Chrono

> Schema completo do banco de dados com todos os models, enums e relações.

---

## Arquivo: prisma/schema.prisma

```prisma
// ============================================
// SISTEMA DE GESTÃO MR. CHRONO
// Schema Prisma - PostgreSQL
// ============================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

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

// ============================================
// USUÁRIOS E AUTENTICAÇÃO
// ============================================

model User {
  id            String       @id @default(cuid())
  email         String       @unique
  nome          String
  senha         String
  nivel         NivelAcesso
  ativo         Boolean      @default(true)
  ultimoAcesso  DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  // Relações
  auditorias    Auditoria[]
  historicos    HistoricoStatus[]

  @@map("users")
}

// Tabelas do Better Auth (serão criadas automaticamente)
// - Session
// - Account
// - Verification

// ============================================
// AUDITORIA
// ============================================

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

// ============================================
// FORNECEDORES
// ============================================

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

// ============================================
// CLIENTES
// ============================================

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

// ============================================
// PEÇAS (ESTOQUE)
// ============================================

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

// ============================================
// FOTOS DAS PEÇAS
// ============================================

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

// ============================================
// HISTÓRICO DE STATUS DAS PEÇAS
// ============================================

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

// ============================================
// VENDAS
// ============================================

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
  taxaMDR           Decimal         @db.Decimal(5, 2) // percentual aplicado
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

// ============================================
// PAGAMENTOS
// ============================================

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

// ============================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================

model Configuracao {
  id        String   @id @default(cuid())
  chave     String   @unique
  valor     String
  updatedAt DateTime @updatedAt

  @@map("configuracoes")
}

// Configurações esperadas:
// - taxa_mdr: "4" (percentual)
// - lead_time_dias: "20"
// - meta_vendas_semana: "10"
// - localizacoes: "Rafael,Pedro,Heitor,Tampograth,Fornecedor,Cliente Final"
// - alerta_relojoeiro_dias: "14"

// ============================================
// ALERTAS
// ============================================

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

---

## Arquivo: prisma/seed.ts

```typescript
import { PrismaClient, NivelAcesso } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Criar usuário admin
  const senhaHash = await hash('MrChrono@2026', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mrchrono.com' },
    update: {},
    create: {
      email: 'admin@mrchrono.com',
      nome: 'Administrador',
      senha: senhaHash,
      nivel: NivelAcesso.ADMINISTRADOR,
      ativo: true,
    },
  })
  
  console.log('✅ Usuário admin criado:', admin.email)

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
  
  console.log('✅ Configurações padrão criadas')

  console.log('🎉 Seed completo!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## Comandos Úteis

```bash
# Sincronizar schema com banco (desenvolvimento)
npm run db:push

# Gerar Prisma Client após mudanças no schema
npm run db:generate

# Abrir Prisma Studio (GUI)
npm run db:studio

# Rodar seed
npm run db:seed

# Validar schema
npx prisma validate

# Formatar schema
npx prisma format

# Ver status do banco
npx prisma db pull

# Criar migration (produção)
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations em produção
npx prisma migrate deploy
```

---

*Documento criado em: Janeiro/2026*
*Copiar conteúdo do schema para prisma/schema.prisma*
