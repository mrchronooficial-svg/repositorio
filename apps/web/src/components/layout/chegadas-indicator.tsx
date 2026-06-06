"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

export function ChegadasIndicator() {
  const { data: pendentes = [] } = useQuery({
    ...trpc.peca.getChegadasPendentes.queryOptions(),
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  const count = pendentes.length;
  if (count === 0) return null;

  return (
    <Link
      href={{ pathname: "/estoque", query: { tab: "previsao" } }}
      aria-label={`${count} chegada(s) a confirmar`}
      title={`${count} chegada(s) a confirmar`}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
    >
      <Truck className="h-5 w-5" />
      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
