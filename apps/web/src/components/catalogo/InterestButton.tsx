"use client";

import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { MessageCircle } from "lucide-react";

interface InterestButtonProps {
  pecaId: string;
  marca: string;
  modelo: string;
  ano: number | null;
}

function getDeviceType(): string {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/tablet/i.test(ua)) return "tablet";
  if (/mobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function InterestButton({ pecaId, marca, modelo, ano }: InterestButtonProps) {
  const registrarEvento = useMutation(
    trpc.catalogo.registrarEvento.mutationOptions()
  );

  const handleClick = () => {
    // Registrar evento (fire-and-forget)
    registrarEvento.mutate({
      tipo: "click_interesse",
      pecaId,
      deviceType: getDeviceType(),
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    });

    // Montar mensagem para WhatsApp com link da peça
    const nomePeca = ano
      ? `${marca} ${modelo} (${ano})`
      : `${marca} ${modelo}`;
    const linkPeca = `${window.location.origin}/catalogo/${pecaId}`;
    const mensagem = `Olá! Tenho interesse no ${nomePeca}. Vi no catálogo da Mr. Chrono.\n\n${linkPeca}`;
    const url = `https://wa.me/5521995505427?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 bg-[#0a1628] text-white font-medium text-sm py-3 rounded-xl transition-colors hover:bg-[#0a1628]/90 active:bg-[#0a1628]/80"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      <MessageCircle className="h-4 w-4" />
      Tenho Interesse
    </button>
  );
}
