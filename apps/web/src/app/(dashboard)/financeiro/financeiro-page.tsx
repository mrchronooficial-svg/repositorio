"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  BookOpen,
  Landmark,
  FileSpreadsheet,
  Receipt,
  ArrowLeftRight,
  Users,
  ArrowRight,
  TrendingUp,
  PiggyBank,
  LayoutDashboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const menuCards: Array<{
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  disabled?: boolean;
}> = [
  {
    title: "Dashboard",
    description: "Visão rápida: saldo, lucro do mês, pendências",
    href: "/financeiro/dashboard",
    icon: LayoutDashboard,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    title: "Plano de Contas",
    description: "Gerencie a estrutura hierarquica de contas contabeis",
    href: "/financeiro/plano-de-contas",
    icon: BookOpen,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    title: "Lancamentos",
    description: "Registre e visualize lancamentos contabeis manuais",
    href: "/financeiro/lancamentos",
    icon: Receipt,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    title: "Despesas Recorrentes",
    description: "Configure despesas fixas com lancamento automatico mensal",
    href: "/financeiro/despesas-recorrentes",
    icon: FileSpreadsheet,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    title: "Transferencias",
    description: "Movimentacoes entre contas bancarias (Nubank / PagBank)",
    href: "/financeiro/transferencias",
    icon: ArrowLeftRight,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    title: "Distribuicao de Lucros",
    description: "Registre retiradas dos socios (Rafael / Joao)",
    href: "/financeiro/distribuicao-lucros",
    icon: Users,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    title: "Demonstrativos",
    description: "DRE, Balanco Patrimonial e Fluxo de Caixa",
    href: "/financeiro/demonstrativos/dre",
    icon: TrendingUp,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    title: "Antecipacao de Recebiveis",
    description: "Antecipe recebiveis de vendas em cartao",
    href: "/financeiro/antecipacao",
    icon: PiggyBank,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  {
    title: "Contas Bancarias",
    description: "Gerencie contas bancarias PJ (Nubank, PagBank)",
    href: "/financeiro/plano-de-contas",
    icon: Landmark,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
];

export function FinanceiroPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modulo Financeiro</h1>
        <p className="text-muted-foreground">
          Contabilidade, demonstrativos e controle financeiro da Mr. Chrono
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={
                card.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-md transition-shadow"
              }
              onClick={() => !card.disabled && router.push(card.href as Route)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className={`h-10 w-10 rounded-full ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                {!card.disabled && (
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {card.disabled && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Em breve
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription className="mt-1">
                  {card.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
