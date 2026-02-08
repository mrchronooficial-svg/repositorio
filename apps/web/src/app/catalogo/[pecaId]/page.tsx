import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, Watch, Crown } from "lucide-react";
import prisma from "@gestaomrchrono/db";
import { WatchCard } from "@/components/catalogo/WatchCard";

// Filtro de 48h: peça disponível OU vendida há menos de 48h
function buildWhereFilter(pecaId: string) {
  const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return {
    id: pecaId,
    arquivado: false,
    OR: [
      { status: { notIn: ["VENDIDA" as const, "DEFEITO" as const, "PERDA" as const] } },
      {
        status: "VENDIDA" as const,
        venda: {
          dataVenda: { gte: limite48h },
          cancelada: false,
        },
      },
    ],
  };
}

const selectFields = {
  id: true,
  marca: true,
  modelo: true,
  ano: true,
  tamanhoCaixa: true,
  materialCaixa: true,
  materialPulseira: true,
  valorEstimadoVenda: true,
  status: true,
  pinnedInCatalog: true,
  createdAt: true,
  fotos: {
    orderBy: { ordem: "asc" as const },
    select: {
      id: true,
      url: true,
      ordem: true,
    },
  },
  venda: {
    select: {
      dataVenda: true,
      cancelada: true,
    },
  },
} as const;

// SSR: gerar meta tags OG dinâmicas para preview no WhatsApp
export async function generateMetadata({
  params,
}: {
  params: Promise<{ pecaId: string }>;
}): Promise<Metadata> {
  const { pecaId } = await params;

  const peca = await prisma.peca.findFirst({
    where: buildWhereFilter(pecaId),
    select: {
      marca: true,
      modelo: true,
      ano: true,
      fotos: {
        orderBy: { ordem: "asc" },
        select: { url: true },
        take: 1,
      },
    },
  });

  if (!peca) {
    return {
      title: "Peça não encontrada — Mr. Chrono",
      description: "Esta peça não está mais disponível no catálogo.",
    };
  }

  const title = peca.ano
    ? `${peca.marca} ${peca.modelo} (${peca.ano}) — Mr. Chrono`
    : `${peca.marca} ${peca.modelo} — Mr. Chrono`;

  const description = "Veja este relógio no catálogo da Mr. Chrono";
  const imageUrl = peca.fotos[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(imageUrl && {
        images: [{ url: imageUrl }],
      }),
    },
  };
}

export default async function PecaIndividualPage({
  params,
}: {
  params: Promise<{ pecaId: string }>;
}) {
  const { pecaId } = await params;

  const peca = await prisma.peca.findFirst({
    where: buildWhereFilter(pecaId),
    select: selectFields,
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header simples */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#0a1628]/[0.06]">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            href={"/catalogo" as Route}
            className="flex items-center gap-1.5 text-sm text-[#0a1628]/60 hover:text-[#0a1628] transition-colors"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-[#0a1628] flex items-center justify-center">
                <Watch className="h-4 w-4 text-amber-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 flex items-center justify-center">
                <Crown className="h-1.5 w-1.5 text-[#0a1628]" />
              </div>
            </div>
            <span
              className="text-base font-semibold text-[#0a1628] tracking-tight"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              Mr. Chrono
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-md mx-auto px-4 py-6">
        {peca ? (
          <WatchCard peca={peca} index={0} />
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0a1628]/5 flex items-center justify-center mx-auto">
              <Watch className="h-8 w-8 text-[#0a1628]/30" />
            </div>
            <div>
              <h2
                className="text-xl font-semibold text-[#0a1628]"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Peça não encontrada
              </h2>
              <p
                className="text-sm text-[#0a1628]/50 mt-1"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
              >
                Esta peça não está mais disponível no catálogo.
              </p>
            </div>
            <Link
              href={"/catalogo" as Route}
              className="inline-flex items-center gap-2 bg-[#0a1628] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#0a1628]/90 transition-colors"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Ver catálogo completo
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
