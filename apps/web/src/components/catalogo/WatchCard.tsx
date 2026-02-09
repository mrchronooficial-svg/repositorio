"use client";

import { useMemo } from "react";
import { Pin } from "lucide-react";
import { calcularPrecoParcelado, formatarPreco } from "@/lib/catalogo/price";
import { PhotoCarousel } from "./PhotoCarousel";
import { UrgencyBadges } from "./UrgencyBadges";
import { InterestButton } from "./InterestButton";
import { ShareButton } from "./ShareButton";

// Type matching the select shape from catalogo.listarPecas
export interface PecaCatalogo {
  id: string;
  marca: string;
  modelo: string;
  ano: number | null;
  tamanhoCaixa: number;
  materialCaixa: string | null;
  materialPulseira: string | null;
  valorEstimadoVenda: unknown; // Decimal comes as string/Decimal
  status: string;
  pinnedInCatalog: boolean;
  createdAt: string | Date;
  fotos: { id: string; url: string; ordem: number }[];
  venda: { dataVenda: string | Date; cancelada: boolean } | null;
}

interface WatchCardProps {
  peca: PecaCatalogo;
  index: number;
}

export function WatchCard({ peca, index }: WatchCardProps) {
  const valorVenda = Number(peca.valorEstimadoVenda);
  const isVendida = peca.status === "VENDIDA";

  const parcelado = useMemo(
    () => calcularPrecoParcelado(valorVenda),
    [valorVenda]
  );

  // Overlay elements for the carousel (destaque badge + sold overlay)
  const carouselOverlay = (
    <>
      {/* Badge "Destaque" */}
      {peca.pinnedInCatalog && !isVendida && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-[#0a1628]/80 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-full">
          <Pin className="h-2.5 w-2.5" />
          Destaque
        </div>
      )}

      {/* Selo VENDIDO */}
      {isVendida && (
        <div className="absolute inset-0 z-10 bg-[#0a1628]/40 flex items-center justify-center pointer-events-none">
          <span
            className="text-white text-2xl font-bold tracking-wider uppercase"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            Vendido
          </span>
        </div>
      )}
    </>
  );

  return (
    <div
      className="bg-white rounded-2xl border border-[#0a1628]/[0.06] overflow-hidden transition-all duration-300 hover:border-[#0a1628]/[0.12]"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {/* Carrossel de fotos */}
      <PhotoCarousel
        fotos={peca.fotos}
        alt={`${peca.marca} ${peca.modelo}`}
        eager={index < 4}
        overlay={carouselOverlay}
      />

      {/* Info */}
      <div className="p-4 space-y-3">
        {/* Marca e modelo */}
        <div>
          <h3
            className="text-lg font-semibold text-[#0a1628] leading-tight"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            {peca.marca} {peca.modelo}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#0a1628]/50">
            {peca.ano && <span>{peca.ano}</span>}
            {peca.ano && peca.tamanhoCaixa && <span>·</span>}
            <span>{peca.tamanhoCaixa}mm</span>
            {peca.materialCaixa && (
              <>
                <span>·</span>
                <span>{peca.materialCaixa}</span>
              </>
            )}
          </div>
        </div>

        {/* Preço */}
        {!isVendida ? (
          <div>
            <p className="text-lg font-bold text-[#0a1628]">
              {formatarPreco(valorVenda)}
              <span className="text-xs font-normal text-[#0a1628]/50 ml-1">
                à vista
              </span>
            </p>
            <p className="text-xs text-[#0a1628]/50">
              ou 12x de {formatarPreco(parcelado.valorParcela)}
            </p>
          </div>
        ) : (
          <div className="inline-block bg-[#0a1628] text-white text-xs font-medium px-3 py-1.5 rounded-lg">
            Vendido
          </div>
        )}

        {/* Badges de urgência (só para peças não vendidas) */}
        {!isVendida && (
          <UrgencyBadges pecaId={peca.id} valor={valorVenda} />
        )}

        {/* Botões de ação */}
        {!isVendida ? (
          <div className="space-y-1">
            <InterestButton
              pecaId={peca.id}
              marca={peca.marca}
              modelo={peca.modelo}
              ano={peca.ano}
            />
            <div className="flex justify-center">
              <ShareButton pecaId={peca.id} />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <ShareButton pecaId={peca.id} />
          </div>
        )}
      </div>
    </div>
  );
}
