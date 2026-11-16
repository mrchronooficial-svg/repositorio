"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { trpc } from "@/utils/trpc";

/**
 * Aviso no topo de todas as paginas (Admin/Socio) quando ha NF-e com erro de
 * emissao ou falha no cancelamento. A consulta tambem atualiza no eNotas o
 * status das notas em processamento (o eNotas Emissor nao envia webhooks).
 */
export function NfeAlertaBanner() {
  const { data } = useQuery({
    ...trpc.nfe.getProblemas.queryOptions(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!data || data.total === 0) return null;

  const partes: string[] = [];
  if (data.erros > 0) {
    partes.push(`${data.erros} venda${data.erros > 1 ? "s" : ""} com erro na emissao da NF-e`);
  }
  if (data.falhasCancelamento > 0) {
    partes.push(
      `${data.falhasCancelamento} NF-e que nao ${data.falhasCancelamento > 1 ? "puderam" : "pode"} ser cancelada${data.falhasCancelamento > 1 ? "s" : ""} no eNotas`
    );
  }

  return (
    <div className="border-b border-red-200 bg-red-50 px-8 py-2.5">
      <div className="flex items-center gap-3 text-sm text-red-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <strong>Atencao NF-e:</strong> {partes.join(" e ")}.
        </span>
        <Link
          href={{ pathname: "/nfe" }}
          className="font-medium underline underline-offset-2 hover:text-red-900"
        >
          Resolver na aba NFe
        </Link>
      </div>
    </div>
  );
}
