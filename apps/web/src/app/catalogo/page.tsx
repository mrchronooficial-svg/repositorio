"use client";

import { Suspense, useState, useEffect } from "react";
import { SplashScreen } from "@/components/catalogo/SplashScreen";
import { CatalogoHeader } from "@/components/catalogo/CatalogoHeader";
import { CatalogoFilters } from "@/components/catalogo/CatalogoFilters";
import { CatalogoFeed } from "@/components/catalogo/CatalogoFeed";
import { useSearchParams } from "next/navigation";

function CatalogoContent() {
  const searchParams = useSearchParams();
  const [showSplash, setShowSplash] = useState(false);

  // Filtros do catálogo (persistidos na URL)
  const marca = searchParams.get("marca") || undefined;
  const precoMin = searchParams.get("precoMin")
    ? Number(searchParams.get("precoMin"))
    : undefined;
  const precoMax = searchParams.get("precoMax")
    ? Number(searchParams.get("precoMax"))
    : undefined;

  // Splash screen apenas na primeira visita da sessão
  useEffect(() => {
    const seen = sessionStorage.getItem("catalogo_splash_seen");
    if (!seen) {
      setShowSplash(true);
    }
  }, []);

  const handleSplashEnd = () => {
    sessionStorage.setItem("catalogo_splash_seen", "1");
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashEnd} />;
  }

  return (
    <>
      <CatalogoHeader />
      <CatalogoFilters marca={marca} precoMin={precoMin} precoMax={precoMax} />
      <CatalogoFeed marca={marca} precoMin={precoMin} precoMax={precoMax} />
    </>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense>
      <CatalogoContent />
    </Suspense>
  );
}
