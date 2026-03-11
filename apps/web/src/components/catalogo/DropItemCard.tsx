"use client";

import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { MessageCircle } from "lucide-react";
import { PhotoCarousel } from "./PhotoCarousel";
import { DropPriceDisplay } from "./DropPriceDisplay";
import { DropSoldOverlay } from "./DropSoldOverlay";

interface DropItemCardProps {
  item: {
    id: string;
    dropPrice: unknown;
    originalPrice: unknown;
    status: string;
    peca: {
      id: string;
      sku: string;
      marca: string;
      modelo: string;
      ano: number | null;
      tamanhoCaixa: number;
      materialCaixa: string | null;
      materialPulseira: string | null;
      fotos: { id: string; url: string; ordem: number }[];
    };
  };
  index: number;
}

function getDeviceType(): string {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/tablet/i.test(ua)) return "tablet";
  if (/mobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function DropItemCard({ item, index }: DropItemCardProps) {
  const { peca } = item;
  const isSold = item.status === "SOLD";
  const dropPrice = Number(item.dropPrice);
  const originalPrice = Number(item.originalPrice);

  const registrarEvento = useMutation(
    trpc.catalogo.registrarEvento.mutationOptions()
  );

  const handleInterest = () => {
    registrarEvento.mutate({
      tipo: "click_interesse",
      pecaId: peca.id,
      deviceType: getDeviceType(),
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    });

    const nomePeca = peca.ano
      ? `${peca.marca} ${peca.modelo} (${peca.ano})`
      : `${peca.marca} ${peca.modelo}`;
    const mensagem = `Olá! Tenho interesse na peça ${nomePeca} do Drop do Dia 🔥`;
    const url = `https://wa.me/5521995505427?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const overlay = isSold ? <DropSoldOverlay /> : null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-white/[0.06]">
      {/* Photos */}
      <PhotoCarousel
        fotos={peca.fotos}
        alt={`${peca.marca} ${peca.modelo}`}
        eager={index < 2}
        overlay={overlay}
      />

      {/* Info */}
      <div className={`p-4 space-y-3 ${isSold ? "opacity-50" : ""}`}>
        {/* Brand/model */}
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

        {/* Price */}
        <DropPriceDisplay dropPrice={dropPrice} originalPrice={originalPrice} isSold={isSold} />

        {/* CTA */}
        {!isSold ? (
          <button
            onClick={handleInterest}
            className="w-full flex items-center justify-center gap-2 bg-[#0a1628] text-white font-medium text-sm py-3 rounded-xl transition-colors hover:bg-[#0a1628]/90 active:bg-[#0a1628]/80"
          >
            <MessageCircle className="h-4 w-4" />
            Tenho Interesse
          </button>
        ) : (
          <button disabled className="w-full flex items-center justify-center gap-2 bg-gray-300 text-gray-500 font-medium text-sm py-3 rounded-xl cursor-not-allowed">
            <MessageCircle className="h-4 w-4" />
            Vendido
          </button>
        )}
      </div>
    </div>
  );
}
