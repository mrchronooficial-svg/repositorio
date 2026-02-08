"use client";

import { useEffect, useState } from "react";
import { Watch, Crown, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { gerarViewersHeader } from "@/lib/catalogo/urgency";

export function CatalogoHeader() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [viewers, setViewers] = useState<number | null>(null);

  const { data: configs } = useQuery(
    trpc.catalogo.getConfiguracoes.queryOptions()
  );

  // Detectar scroll para sombra
  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Gerar número de viewers quando configs carregam + flutuação ao vivo
  useEffect(() => {
    if (!configs) return;
    const min = parseInt(configs.catalogo_urgencia_header_viewers_min || "15");
    const max = parseInt(configs.catalogo_urgencia_header_viewers_max || "45");
    const base = gerarViewersHeader(min, max);
    setViewers(base);

    const interval = setInterval(() => {
      setViewers((prev) => {
        if (prev === null) return base;
        const delta = Math.floor(Math.random() * 5) - 2; // -2 a +2
        return Math.max(min, Math.min(max, prev + delta));
      });
    }, 4000 + Math.random() * 2000); // 4-6s

    return () => clearInterval(interval);
  }, [configs]);

  return (
    <header
      className="sticky top-0 z-40 bg-white transition-shadow duration-300"
      style={{
        boxShadow: hasScrolled
          ? "0 1px 8px rgba(10, 22, 40, 0.08)"
          : "none",
      }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-[#0a1628] flex items-center justify-center">
              <Watch className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center">
              <Crown className="h-2 w-2 text-[#0a1628]" />
            </div>
          </div>
          <span
            className="text-lg font-semibold text-[#0a1628] tracking-tight"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            Mr. Chrono
          </span>
        </div>

        {/* Viewers counter */}
        {viewers !== null && (
          <div
            className="flex items-center gap-1.5 text-xs text-[#0a1628]/50"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>
              <strong className="text-[#0a1628]/70 inline-block transition-all duration-500">{viewers}</strong> vendo
              agora
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
