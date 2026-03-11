"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { SplashScreen } from "@/components/catalogo/SplashScreen";
import { CatalogoHeader } from "@/components/catalogo/CatalogoHeader";
import { CatalogoFilters } from "@/components/catalogo/CatalogoFilters";
import { CatalogoFeed } from "@/components/catalogo/CatalogoFeed";
import { BottomTabBar } from "@/components/catalogo/BottomTabBar";
import { SwipeContainer } from "@/components/catalogo/SwipeContainer";
import { DropDoDiaTab } from "@/components/catalogo/DropDoDiaTab";
import { useSearchParams } from "next/navigation";

function CatalogoContent() {
  const searchParams = useSearchParams();
  const [showSplash, setShowSplash] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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

  const handleTabChange = useCallback((index: number) => {
    setActiveTab(index);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashEnd} />;
  }

  return (
    <>
      <SwipeContainer activeTab={activeTab} onTabChange={handleTabChange}>
        {/* Tab 0: Catálogo */}
        <div className="pb-16">
          <CatalogoHeader />
          <CatalogoFilters marca={marca} precoMin={precoMin} precoMax={precoMax} />
          <CatalogoFeed marca={marca} precoMin={precoMin} precoMax={precoMax} />
        </div>

        {/* Tab 1: Drop do Dia */}
        <div className="pb-16">
          <DropDoDiaTab />
        </div>
      </SwipeContainer>

      <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} />
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
