"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";
import { WatchFitLeadsTab } from "@/components/leads/watch-fit-leads-tab";
import { VipLeadsTab } from "@/components/leads/vip-leads-tab";

type Tab = "watch-fit" | "vip-chrono";

export function LeadsPage() {
  const [tab, setTab] = useState<Tab>("watch-fit");

  // Contadores de "novos" para mostrar no rótulo da aba
  const { data: watchFitStats } = useQuery(
    trpc.lead.stats.queryOptions(undefined, {
      staleTime: 30_000,
      refetchInterval: 60_000,
    }),
  );
  const { data: vipStats } = useQuery(
    trpc.leadVip.stats.queryOptions(undefined, {
      staleTime: 30_000,
      refetchInterval: 60_000,
    }),
  );

  const watchFitNovos = watchFitStats?.novos ?? 0;
  const vipNovos = vipStats?.novos ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">
          Gerencie os leads captados pelos formulários públicos da Mr. Chrono
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-1" role="tablist" aria-label="Formulários de leads">
          <TabButton
            label="Watch Fit"
            badge={watchFitNovos}
            active={tab === "watch-fit"}
            onClick={() => setTab("watch-fit")}
          />
          <TabButton
            label="VIP Chrono"
            badge={vipNovos}
            active={tab === "vip-chrono"}
            onClick={() => setTab("vip-chrono")}
          />
        </nav>
      </div>

      {/* Conteúdo da aba */}
      {tab === "watch-fit" ? <WatchFitLeadsTab /> : <VipLeadsTab />}
    </div>
  );
}

function TabButton({
  label,
  badge,
  active,
  onClick,
}: {
  label: string;
  badge: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2",
        active
          ? "text-foreground border-amber-500"
          : "text-muted-foreground border-transparent hover:text-foreground hover:border-border",
      )}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {badge > 0 && (
          <span
            className={cn(
              "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold",
              active
                ? "bg-amber-500 text-white"
                : "bg-amber-100 text-amber-800 border border-amber-200",
            )}
            aria-label={`${badge} novos`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
    </button>
  );
}
