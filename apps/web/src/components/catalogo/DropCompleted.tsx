"use client";

import { useCountdown } from "@/lib/catalogo/drop";

interface DropCompletedProps {
  drop: {
    items: Array<{
      id: string;
      dropPrice: unknown;
      originalPrice: unknown;
      status: string;
      peca: {
        id: string;
        marca: string;
        modelo: string;
        fotos: { id: string; url: string; ordem: number }[];
      };
    }>;
  };
  nextDrop?: { launchDateTime: string | Date; launchTime: string } | null;
}

export function DropCompleted({ nextDrop }: DropCompletedProps) {
  const countdown = useCountdown(nextDrop?.launchDateTime ?? null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#121a2e] flex flex-col items-center justify-center px-6"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
      {/* Icon */}
      <div className="mb-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h2
        className="text-white text-2xl font-bold mb-2"
        style={{ fontFamily: "var(--font-cormorant), serif" }}
      >
        Drop Encerrado!
      </h2>
      <p className="text-white/50 text-sm mb-8">
        Todas as peças foram vendidas
      </p>

      {nextDrop && !countdown.isExpired && (
        <div className="text-center">
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3">
            Próximo Drop em
          </p>
          <div className="flex items-center gap-2">
            {[
              countdown.hours.toString().padStart(2, "0"),
              countdown.minutes.toString().padStart(2, "0"),
              countdown.seconds.toString().padStart(2, "0"),
            ].map((val, i) => (
              <div key={i} className="flex items-center">
                {i > 0 && <span className="text-amber-400/40 text-xl mx-1">:</span>}
                <span className="text-white text-2xl font-bold tabular-nums">{val}</span>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-2">às {nextDrop.launchTime}</p>
        </div>
      )}

      {!nextDrop && (
        <p className="text-white/40 text-sm">Volte amanhã para o próximo drop!</p>
      )}
    </div>
  );
}
