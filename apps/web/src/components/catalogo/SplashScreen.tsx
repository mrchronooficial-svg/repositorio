"use client";

import { useEffect, useState } from "react";
import { Watch, Crown } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "visible" | "out">("in");

  useEffect(() => {
    // Fade in → visible for 1.5s → fade out
    const fadeInTimer = setTimeout(() => setPhase("visible"), 50);
    const holdTimer = setTimeout(() => setPhase("out"), 1600);
    const finishTimer = setTimeout(() => onFinish(), 2400);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(holdTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1628] transition-opacity duration-700"
      style={{
        opacity: phase === "in" ? 0 : phase === "out" ? 0 : 1,
      }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Watch className="h-10 w-10 text-white drop-shadow" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
            <Crown className="h-3.5 w-3.5 text-white" />
          </div>
        </div>

        {/* Nome */}
        <div className="text-center">
          <h1
            className="text-3xl font-semibold text-white tracking-tight"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            Mr. Chrono
          </h1>
          <p
            className="text-sm text-amber-400/80 font-medium tracking-widest uppercase mt-1"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            Catálogo
          </p>
        </div>
      </div>
    </div>
  );
}
