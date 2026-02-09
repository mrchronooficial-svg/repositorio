"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Foto {
  id: string;
  url: string;
  ordem: number;
}

interface PhotoCarouselProps {
  fotos: Foto[];
  alt: string;
  eager?: boolean;
  overlay?: React.ReactNode;
}

export function PhotoCarousel({ fotos, alt, eager, overlay }: PhotoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalFotos = fotos.length;

  // Detectar slide ativo via scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, []);

  const goPrev = useCallback(() => {
    scrollTo(Math.max(0, activeIndex - 1));
  }, [activeIndex, scrollTo]);

  const goNext = useCallback(() => {
    scrollTo(Math.min(totalFotos - 1, activeIndex + 1));
  }, [activeIndex, totalFotos, scrollTo]);

  if (totalFotos === 0) {
    return (
      <div className="relative aspect-square bg-[#f5f5f3]">
        <div className="w-full h-full flex items-center justify-center text-[#0a1628]/20 text-sm">
          Sem foto
        </div>
        {overlay}
      </div>
    );
  }

  if (totalFotos === 1) {
    return (
      <div className="relative aspect-square bg-[#f5f5f3]">
        <img
          src={fotos[0]!.url}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          loading={eager ? "eager" : "lazy"}
        />
        {overlay}
      </div>
    );
  }

  return (
    <div className="relative aspect-square bg-[#f5f5f3] group">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {fotos.map((foto, i) => (
          <div key={foto.id} className="w-full h-full shrink-0 snap-center">
            <img
              src={foto.url}
              alt={`${alt} - foto ${i + 1}`}
              className="w-full h-full object-cover"
              loading={i === 0 && eager ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      {/* Arrows (desktop hover) */}
      {activeIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
          aria-label="Foto anterior"
        >
          <ChevronLeft className="h-4 w-4 text-[#0a1628]" />
        </button>
      )}
      {activeIndex < totalFotos - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
          aria-label="Próxima foto"
        >
          <ChevronRight className="h-4 w-4 text-[#0a1628]" />
        </button>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {fotos.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              i === activeIndex
                ? "bg-white w-3"
                : "bg-white/50"
            }`}
            aria-label={`Ir para foto ${i + 1}`}
          />
        ))}
      </div>

      {/* Overlay (destaque badge, vendido selo) */}
      {overlay}
    </div>
  );
}
