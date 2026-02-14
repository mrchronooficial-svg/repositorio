"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "DRE", href: "/financeiro/demonstrativos/dre" },
  { label: "Balanço Patrimonial", href: "/financeiro/demonstrativos/balanco" },
  { label: "Fluxo de Caixa", href: "/financeiro/demonstrativos/fluxo-de-caixa" },
];

export function DemonstrativosNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 border-b mb-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
