"use client";

import { Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomTabBarProps {
  activeTab: number;
  onTabChange: (index: number) => void;
}

const tabs = [
  { label: "Catálogo", icon: Clock },
  { label: "Drop do Dia", icon: Zap },
];

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#0a1628]/[0.08]"
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <div className="flex items-center justify-center gap-12 h-14 max-w-md mx-auto">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = activeTab === i;
          return (
            <button
              key={tab.label}
              onClick={() => onTabChange(i)}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors",
                isActive ? "text-[#0a1628]" : "text-[#0a1628]/40"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-current")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area for iPhone */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
