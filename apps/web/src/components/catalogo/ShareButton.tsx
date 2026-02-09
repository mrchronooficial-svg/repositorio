"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  pecaId: string;
}

function getDeviceType(): string {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/tablet/i.test(ua)) return "tablet";
  if (/mobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function ShareButton({ pecaId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const registrarEvento = useMutation(
    trpc.catalogo.registrarEvento.mutationOptions()
  );

  const handleShare = async () => {
    // Registrar evento (fire-and-forget)
    registrarEvento.mutate({
      tipo: "click_share",
      pecaId,
      deviceType: getDeviceType(),
    });

    const shareUrl = `${window.location.origin}/catalogo/${pecaId}`;

    // Tentar navigator.share no mobile
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Mr. Chrono — Catálogo",
          url: shareUrl,
        });
        return;
      } catch {
        // Se o usuário cancelou ou não suporta, fallback para clipboard
      }
    }

    // Fallback: copiar para clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback final: selecionar texto
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-1.5 text-xs text-[#0a1628]/50 hover:text-[#0a1628]/70 transition-colors py-2"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-600">Link copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          <span>Compartilhar</span>
        </>
      )}
    </button>
  );
}
