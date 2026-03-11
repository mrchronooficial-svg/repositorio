"use client";

import { useCountdown } from "@/lib/catalogo/drop";

interface DropCountdownProps {
  launchDateTime: string | Date;
  launchTime: string;
}

export function DropCountdown({ launchDateTime, launchTime }: DropCountdownProps) {
  const { hours, minutes, seconds, isExpired } = useCountdown(launchDateTime);

  // Format as 2-digit
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (isExpired) {
    // Countdown expired, the polling will pick up the active state
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#0a1628] flex flex-col items-center justify-center px-6"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
      {/* Zap icon with glow */}
      <div className="mb-8">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      <p className="text-white/60 text-sm tracking-widest uppercase mb-4">
        Próximo Drop em
      </p>

      {/* Countdown */}
      <div className="flex items-center gap-3 mb-6">
        {[
          { value: pad(hours), label: "h" },
          { value: pad(minutes), label: "m" },
          { value: pad(seconds), label: "s" },
        ].map((unit, i) => (
          <div key={i} className="flex items-baseline">
            {i > 0 && <span className="text-amber-400/60 text-3xl font-light mr-3">:</span>}
            <span className="text-white text-5xl font-bold tabular-nums" style={{ fontFamily: "var(--font-dm-sans), monospace" }}>
              {unit.value}
            </span>
            <span className="text-white/40 text-sm ml-1">{unit.label}</span>
          </div>
        ))}
      </div>

      <p className="text-white/40 text-sm">
        Hoje às {launchTime}
      </p>
    </div>
  );
}
