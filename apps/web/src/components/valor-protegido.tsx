"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters";

interface ValorProtegidoProps {
  valor: number | string | null | undefined;
  /** Texto a exibir se não tiver permissão */
  placeholder?: string;
  /** Classes CSS adicionais */
  className?: string;
}

export function ValorProtegido({
  valor,
  placeholder = "---",
  className = "",
}: ValorProtegidoProps) {
  const { podeVerValores, isLoading } = usePermissions();

  if (isLoading) {
    return <span className={`text-muted-foreground ${className}`}>...</span>;
  }

  if (!podeVerValores) {
    return <span className={`text-muted-foreground ${className}`}>{placeholder}</span>;
  }

  const numValue = typeof valor === "string" ? parseFloat(valor) : valor;

  return <span className={className}>{formatCurrency(numValue)}</span>;
}
